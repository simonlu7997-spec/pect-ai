package setting

var (
	C2CoinEnabled      bool
	C2CoinContractAddr string = "0x5A8a8586A4defba35F066382e3f71273943EFb0E"
	C2CoinNetwork      string = "Polygon Amoy"
	C2CoinExchangeRate int    = 100 // 1 USDT = 100 C2Coin
	C2CoinMinTopUp     int    = 100
	C2CoinInstructions string = "Send the exact C2Coin amount to the address shown. The tokens will be burned upon confirmation."
	C2CoinBurnAddress  string = "0x000000000000000000000000000000000000dEaD"
)
