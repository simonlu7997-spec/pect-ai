package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type C2CoinPayRequest struct {
	Amount int64 `json:"amount"`
}

func isC2CoinTopUpEnabled() bool {
	return setting.C2CoinEnabled
}

func getC2CoinQuota(amount int64, group string) float64 {
	// amount = C2Coin数量
	// 1 USDT = C2CoinExchangeRate C2Coin
	// 换算成USDT等值金额
	dAmount := decimal.NewFromInt(amount).
		Div(decimal.NewFromFloat(float64(setting.C2CoinExchangeRate)))

	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount = dAmount.Div(decimal.NewFromFloat(common.QuotaPerUnit))
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok && ds > 0 {
		discount = ds
	}

	// 用 USDT UnitPrice 来计算等值美元额度
	return dAmount.
		Mul(decimal.NewFromFloat(setting.UsdtUnitPrice)).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discount)).
		InexactFloat64()
}

func normalizeC2CoinTopUpAmount(amount int64) int64 {
	if operation_setting.GetQuotaDisplayType() != operation_setting.QuotaDisplayTypeTokens {
		return amount
	}

	normalized := decimal.NewFromInt(amount).
		Div(decimal.NewFromFloat(common.QuotaPerUnit)).
		IntPart()
	if normalized < 1 {
		return 1
	}
	return normalized
}

func RequestC2CoinAmount(c *gin.Context) {
	var req C2CoinPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < int64(setting.C2CoinMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d C2Coin", setting.C2CoinMinTopUp)})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	quota := getC2CoinQuota(req.Amount, group)
	if quota <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(quota, 'f', 2, 64)})
}

func RequestC2CoinPay(c *gin.Context) {
	if !isC2CoinTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "C2Coin 充值未启用"})
		return
	}

	var req C2CoinPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < int64(setting.C2CoinMinTopUp) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d C2Coin", setting.C2CoinMinTopUp)})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	quota := getC2CoinQuota(req.Amount, group)
	if quota <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	tradeNo := fmt.Sprintf("C2C%dNO%s%d", id, common.GetRandomString(6), time.Now().Unix())
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          normalizeC2CoinTopUpAmount(req.Amount),
		Money:           quota,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodC2Coin,
		PaymentProvider: model.PaymentProviderC2Coin,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("C2Coin 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	// C2Coin数量 = 用户输入的amount
	c2coinAmount := req.Amount
	// 等值USDT
	usdtEquivalent := float64(c2coinAmount) / float64(setting.C2CoinExchangeRate)

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("C2Coin 充值订单创建成功 user_id=%d trade_no=%s c2coin_amount=%d usdt_equivalent=%.2f status=pending", id, tradeNo, c2coinAmount, usdtEquivalent))

	network := strings.TrimSpace(setting.C2CoinNetwork)
	contractAddr := strings.TrimSpace(setting.C2CoinContractAddr)
	burnAddr := strings.TrimSpace(setting.C2CoinBurnAddress)

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"trade_no":          tradeNo,
			"network":           network,
			"contract_address":  contractAddr,
			"c2coin_amount":     c2coinAmount,
			"usdt_equivalent":   strconv.FormatFloat(usdtEquivalent, 'f', 2, 64),
			"burn_address":      burnAddr,
			"instructions":      setting.C2CoinInstructions,
		},
	})
}
