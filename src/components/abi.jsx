

export const ABI = {
  ERC20: [
    "function balanceOf(address) public view returns (uint256)",
    "function allowance(address,address) public view returns (uint256)",
    "function approve(address spender, uint256 value) external returns (bool)",
    "function totalSupply() public view returns (uint256)"
  ],
  PRIZESTRATEGY: ["function isRngRequested() public view returns (bool)",
  "function prizePeriodRemainingSeconds() external view returns (uint256)"],

  PRIZEPOOL: [
    "function depositTo(address to,uint256 amount,address controlledToken,address referrer) external",
    "function withdrawInstantlyFrom(address from,uint256 amount,address controlledToken,uint256 maximumExitFee) external returns (uint256)",
    "function calculateEarlyExitFee(address from,address controlledToken,uint256 amount) external returns (uint256 exitFee,uint256 burnedCredit)",
  ]
}

