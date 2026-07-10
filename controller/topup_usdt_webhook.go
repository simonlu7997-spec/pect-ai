package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

// TronGridWebhookPayload represents the TronGrid webhook event structure.
// TronGrid sends webhook events as an array of event objects.
type TronGridWebhookEvent struct {
	ID        string `json:"id"`
	WebhookID string `json:"webhook_id"`
	Confirmed bool   `json:"confirmed"`
	ContractRet string `json:"contract_ret"`
	Transaction struct {
		TxID     string `json:"txID"`
		RawData  struct {
			Contract []struct {
				Parameter struct {
					Value struct {
						Amount       json.Number `json:"amount"`
						OwnerAddress string      `json:"owner_address"`
						ToAddress    string      `json:"to_address"`
						ContractAddress string  `json:"contract_address"`
					} `json:"value"`
					TypeURL string `json:"type_url"`
				} `json:"parameter"`
				Type string `json:"type"`
			} `json:"contract"`
		} `json:"raw_data"`
	} `json:"transaction"`
	ContractInfo struct {
		Name   string `json:"name"`
		Symbol string `json:"symbol"`
	} `json:"contract_info"`
}

const (
	// TRC20 USDT contract address on Tron mainnet
	tronUsdtContractMainnet = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
	// TRC20 USDT on Tron testnet (Shasta, for testing)
	tronUsdtContractShasta = "TG3XXUExa4JkSJCDdRWJE5cFEi2JjRnQCU"
)

// UsdtWebhookStatus tracks whether the webhook endpoint has been configured.
type UsdtWebhookStatus struct {
	Configured bool   `json:"configured"`
	WebhookURL string `json:"webhook_url"`
}

// RequestUsdtWebhook handles incoming TronGrid TRC20 transfer webhooks.
// TronGrid sends POST requests when a USDT transfer occurs involving our
// monitored address. We verify the tx, match it to a pending order, and
// auto-confirm on chain confirmation.
func RequestUsdtWebhook(c *gin.Context) {
	// Read raw body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("USDT webhook: failed to read body: %v", err))
		c.JSON(http.StatusOK, gin.H{"message": "error"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("USDT webhook: received event body=%s", string(body)))

	// Parse webhook payload. TronGrid may send a single event or an array.
	var events []TronGridWebhookEvent
	rawStr := strings.TrimSpace(string(body))

	if strings.HasPrefix(rawStr, "[") {
		// Array of events
		if err := json.Unmarshal(body, &events); err != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("USDT webhook: failed to parse event array: %v body=%s", err, string(body)))
			c.JSON(http.StatusOK, gin.H{"message": "error"})
			return
		}
	} else {
		// Single event - wrap in array for uniform processing
		var singleEvent TronGridWebhookEvent
		if err := json.Unmarshal(body, &singleEvent); err != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("USDT webhook: failed to parse single event: %v body=%s", err, string(body)))
			c.JSON(http.StatusOK, gin.H{"message": "error"})
			return
		}
		events = []TronGridWebhookEvent{singleEvent}
	}

	ourAddress := strings.TrimSpace(setting.UsdtAddress)
	if ourAddress == "" {
		logger.LogWarn(c.Request.Context(), "USDT webhook: receiving address not configured")
		c.JSON(http.StatusOK, gin.H{"message": "error"})
		return
	}
	// Tron addresses are base58; convert for comparison (case-insensitive)
	ourAddressNormalized := strings.ToUpper(ourAddress)

	for _, evt := range events {
		// Only process confirmed transactions
		if !evt.Confirmed {
			logger.LogInfo(c.Request.Context(), fmt.Sprintf("USDT webhook: skipping unconfirmed tx txID=%s", evt.Transaction.TxID))
			continue
		}

		// Extract contract details
		for _, contract := range evt.Transaction.RawData.Contract {
			if contract.Type != "TriggerSmartContract" {
				continue
			}

			val := contract.Parameter.Value
			contractAddr := strings.ToUpper(strings.TrimSpace(val.ContractAddress))

			// Verify it's USDT (check contract address)
			isUsdt := contractAddr == strings.ToUpper(tronUsdtContractMainnet) ||
				contractAddr == strings.ToUpper(tronUsdtContractShasta)
			if !isUsdt {
				continue
			}

			// Verify the recipient is our wallet
			toAddr := strings.ToUpper(strings.TrimSpace(val.ToAddress))
			if toAddr != ourAddressNormalized {
				logger.LogInfo(c.Request.Context(), fmt.Sprintf("USDT webhook: tx to different address txID=%s to=%s", evt.Transaction.TxID, val.ToAddress))
				continue
			}

			// Get the transfer amount (USDT decimals = 6)
			amountStr := string(val.Amount)
			// Parse as decimal, then divide by 10^6
			amountDecimal, err := decimal.NewFromString(amountStr)
			if err != nil {
				logger.LogWarn(c.Request.Context(), fmt.Sprintf("USDT webhook: invalid amount txID=%s amount=%s", evt.Transaction.TxID, amountStr))
				continue
			}
			usdtAmount := amountDecimal.Div(decimal.NewFromInt(1_000_000)).InexactFloat64()

			logger.LogInfo(c.Request.Context(), fmt.Sprintf("USDT webhook: valid transfer detected txID=%s from=%s amount=%.6f USDT", evt.Transaction.TxID, val.OwnerAddress, usdtAmount))

			// Find pending USDT order matching this amount
			topUp := findPendingUsdtOrder(usdtAmount)
			if topUp == nil {
				logger.LogInfo(c.Request.Context(), fmt.Sprintf("USDT webhook: no pending order matches amount=%.6f txID=%s", usdtAmount, evt.Transaction.TxID))
				continue
			}

			// Confirm the order
			confirmUsdtOrder(topUp, evt.Transaction.TxID)
			logger.LogInfo(c.Request.Context(), fmt.Sprintf("USDT webhook: order auto-confirmed trade_no=%s user_id=%d amount=%.6f txID=%s", topUp.TradeNo, topUp.UserId, usdtAmount, evt.Transaction.TxID))
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "success"})
}

// findPendingUsdtOrder looks for a pending USDT order whose money matches the given amount.
// The amount matching uses a tolerance of ±0.01 USDT to handle rounding differences.
func findPendingUsdtOrder(usdtAmount float64) *model.TopUp {
	dAmount := decimal.NewFromFloat(usdtAmount)

	// Get all pending USDT orders
	orders, err := model.GetPendingUsdtTopUps()
	if err != nil {
		common.SysLog(fmt.Sprintf("USDT findPendingUsdtOrder: database error: %v", err))
		return nil
	}

	for _, order := range orders {
		dOrderMoney := decimal.NewFromFloat(order.Money)
		// Check if amounts match within tolerance
		diff := dAmount.Sub(dOrderMoney).Abs()
		if diff.LessThanOrEqual(decimal.NewFromFloat(0.01)) {
			return order
		}
	}

	return nil
}

// confirmUsdtOrder marks a USDT order as success and credits the user's quota.
func confirmUsdtOrder(topUp *model.TopUp, txID string) {
	// Mark as success
	topUp.Status = common.TopUpStatusSuccess

	// Credit quota
	dAmount := decimal.NewFromInt(int64(topUp.Amount))
	dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())

	if err := model.IncreaseUserQuota(topUp.UserId, quotaToAdd, true); err != nil {
		common.SysLog(fmt.Sprintf("USDT confirmUsdtOrder: failed to increase quota user_id=%d trade_no=%s quota=%d err=%v", topUp.UserId, topUp.TradeNo, quotaToAdd, err))
		return
	}

	if err := topUp.Update(); err != nil {
		common.SysLog(fmt.Sprintf("USDT confirmUsdtOrder: failed to update order trade_no=%s err=%v", topUp.TradeNo, err))
		return
	}

	model.RecordTopupLog(topUp.UserId, fmt.Sprintf("USDT 链上确认到账，交易哈希: %s，充值额度: %v，支付金额：%.2f", txID, logger.FormatQuota(quotaToAdd), topUp.Money), "webhook", topUp.PaymentMethod, "usdt")
}
