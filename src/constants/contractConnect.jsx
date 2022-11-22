
import { ethers } from "ethers";
import { PROVIDERS } from "./providers.jsx"
import { ABI } from "./abi.jsx"
import { ADDRESS } from "./address.jsx"


export const CONTRACT = {
  ETHEREUM: {
    PRIZEPOOL: new ethers.Contract(
      ADDRESS.ETHEREUM.PRIZEPOOL,
      ABI.PRIZEPOOL,
      PROVIDERS.ETHEREUM
    ),
    PRIZESTRATEGY: new ethers.Contract(
      ADDRESS.ETHEREUM.PRIZESTRATEGY,
      ABI.PRIZESTRATEGY,
      PROVIDERS.ETHEREUM
    ),
    STETH: new ethers.Contract(
      ADDRESS.ETHEREUM.STETH,
      ABI.ERC20,
      PROVIDERS.ETHEREUM
    ),
    ETHWIN: new ethers.Contract(
      ADDRESS.ETHEREUM.ETHWIN,
      ABI.ERC20,
      PROVIDERS.ETHEREUM
    ),
    SPETHWIN: new ethers.Contract(
      ADDRESS.ETHEREUM.SPETHWIN,
      ABI.ERC20,
      PROVIDERS.ETHEREUM
    ),
  },
  GOERLI: {
    PRIZEPOOL: new ethers.Contract(
      ADDRESS.GOERLI.PRIZEPOOL,
      ABI.PRIZEPOOL,
      PROVIDERS.GOERLI
    ),
    PRIZESTRATEGY: new ethers.Contract(
      ADDRESS.GOERLI.PRIZESTRATEGY,
      ABI.PRIZESTRATEGY,
      PROVIDERS.GOERLI
    ),
    STETH: new ethers.Contract(
      ADDRESS.GOERLI.STETH,
      ABI.ERC20,
      PROVIDERS.GOERLI
    ),
    ETHWIN: new ethers.Contract(
      ADDRESS.GOERLI.ETHWIN,
      ABI.ERC20,
      PROVIDERS.GOERLI
    ),
    SPETHWIN: new ethers.Contract(
      ADDRESS.GOERLI.SPETHWIN,
      ABI.ERC20,
      PROVIDERS.GOERLI
    ),
  },
}

