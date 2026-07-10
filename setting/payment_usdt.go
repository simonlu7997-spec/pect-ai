package setting

var (
	UsdtEnabled      bool
	UsdtNetwork      string  = "TRC20"
	UsdtAddress      string  = ""
	UsdtUnitPrice    float64 = 1.0
	UsdtMinTopUp     int     = 10
	UsdtInstructions string  = "Transfer the exact USDT amount to the address shown, then contact support with the order number and transaction hash."
	TronGridApiKey   string  = ""
)
