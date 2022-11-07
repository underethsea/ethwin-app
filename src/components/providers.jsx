
import { ethers } from "ethers";
import * as dotenv from 'dotenv' 
dotenv.config()

  // const optimismEndpoint = "https://opt-mainnet.g.alchemy.com/v2/" + process.env.REACT_APP_ALCHEMY_KEY
  // const polygonEndpoint = "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.REACT_APP_ALCHEMY_KEY
  // const avalancheEndpoint = "https://api.avax.network/ext/bc/C/rpc";
  const ethereumEndpoint = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.REACT_APP_ALCHEMY_KEY;

  const goerliEndpoint = "https://eth-goerli.alchemyapi.io/v2/"  + process.env.REACT_APP_ALCHEMY_KEY
   
export const PROVIDERS = {
    // POLYGON: new ethers.providers.JsonRpcProvider(polygonEndpoint),
    // AVALANCHE: new ethers.providers.JsonRpcProvider(avalancheEndpoint),
    // OPTIMISM: new ethers.providers.JsonRpcProvider(optimismEndpoint),

    ETHEREUM: new ethers.providers.JsonRpcProvider(ethereumEndpoint),
    GOERLI: new ethers.providers.JsonRpcProvider(goerliEndpoint)
  }
  