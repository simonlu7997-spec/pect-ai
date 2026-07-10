package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/shopspring/decimal"
)

const (
	pollInterval     = 30 * time.Second
	tronGridMainnet  = "https://api.trongrid.io"
	usdtContract     = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
)

// trc20Tx represents a single TRC20 transfer from TronGrid API.
type trc20Tx struct {
	TransactionID string `json:"transaction_id"`
	TokenInfo     struct {
		Symbol   string `json:"symbol"`
		Address  string `json:"address"`
		Decimals int    `json:"decimals"`
		Name     string `json:"name"`
	} `json:"token_info"`
	BlockTimestamp int64  `json:"block_timestamp"`
	From           string `json:"from"`
	To             string `json:"to"`
	Type           string `json:"type"`
	Value          string `json:"value"` // amount in smallest unit (sun for TRC20)
}

type trc20Response struct {
	Data    []trc20Tx `json:"data"`
	Success bool      `json:"success"`
	Meta    struct {
		At          int64  `json:"at"`
		PageSize    int    `json:"page_size"`
		Fingerprint string `json:"fingerprint"`
	} `json:"meta"`
}

// processedTxns tracks recently processed txIDs to avoid duplicate confirmations.
var processedTxns = make(map[string]time.Time)

var usdtHttpClient = &http.Client{Timeout: 15 * time.Second}

// StartUsdtPoller launches the background goroutine that polls TronGrid for USDT payments.
func StartUsdtPoller() {
	common.SysLog("USDT poller: starting (interval=30s)")
	go func() {
		// Initial delay to let app settle
		time.Sleep(5 * time.Second)
		for {
			pollUsdtTransactions()
			time.Sleep(pollInterval)
		}
	}()
}

// pollUsdtTransactions queries TronGrid for USDT transfers to our wallet.
func pollUsdtTransactions() {
	address := strings.TrimSpace(setting.UsdtAddress)
	if address == "" {
		return
	}

	// Build the TronGrid API URL
	// GET /v1/accounts/{address}/transactions/trc20
	// ?contract_address={usdt_contract}&only_confirmed=true&only_to=true&limit=20&order_by=block_timestamp,desc
	url := fmt.Sprintf("%s/v1/accounts/%s/transactions/trc20?contract_address=%s&only_confirmed=true&only_to=true&limit=20&order_by=block_timestamp,desc",
		tronGridMainnet, address, usdtContract)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return
	}

	// If we have a TronGrid API key, use it
	apiKey := setting.TronGridApiKey
	if apiKey != "" {
		req.Header.Set("TRON-PRO-API-KEY", apiKey)
	}

	resp, err := usdtHttpClient.Do(req)
	if err != nil {
		common.SysLog(fmt.Sprintf("USDT poller: API error: %v", err))
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}

	var result trc20Response
	if err := json.Unmarshal(body, &result); err != nil {
		common.SysLog(fmt.Sprintf("USDT poller: parse error: %v", err))
		return
	}

	if !result.Success {
		return
	}

	// Get pending orders
	orders, err := model.GetPendingUsdtTopUps()
	if err != nil || len(orders) == 0 {
		return
	}

	now := time.Now()
	for _, tx := range result.Data {
		if tx.Type != "Transfer" {
			continue
		}

		txID := tx.TransactionID
		toAddr := strings.ToUpper(strings.TrimSpace(tx.To))
		ourAddr := strings.ToUpper(strings.TrimSpace(address))

		// Check recipient is our wallet
		if toAddr != ourAddr {
			continue
		}

		// Skip if already processed recently
		if _, exists := processedTxns[txID]; exists {
			continue
		}
		processedTxns[txID] = now

		// Parse USDT amount (6 decimals)
		amountDecimal, err := decimal.NewFromString(tx.Value)
		if err != nil {
			continue
		}
		usdtAmount := amountDecimal.Div(decimal.NewFromInt(1_000_000)).InexactFloat64()

		common.SysLog(fmt.Sprintf("USDT poller: detected tx=%s from=%s amount=%.2f to=%s", txID, tx.From, usdtAmount, tx.To))

		// Find matching pending order
		matched := false
		for _, order := range orders {
			dOrderMoney := decimal.NewFromFloat(order.Money)
			dTxAmount := decimal.NewFromFloat(usdtAmount)
			diff := dTxAmount.Sub(dOrderMoney).Abs()

			if diff.LessThanOrEqual(decimal.NewFromFloat(0.10)) {
				common.SysLog(fmt.Sprintf("USDT poller: MATCH! order=%s user=%d tx=%s amount=%.2f (order=%.2f diff=%.4f)", order.TradeNo, order.UserId, txID, usdtAmount, order.Money, diff.InexactFloat64()))
				confirmUsdtOrder(order, txID)
				matched = true
				break
			}
		}

		if !matched {
			common.SysError(fmt.Sprintf("USDT poller: UNMATCHED transaction! tx=%s from=%s amount=%.2f — 未匹配到任何待处理订单，请人工确认", txID, tx.From, usdtAmount))
		}
	}

	// Cleanup old processed txs (>1 hour)
	cutoff := now.Add(-1 * time.Hour)
	for id, t := range processedTxns {
		if t.Before(cutoff) {
			delete(processedTxns, id)
		}
	}
}
