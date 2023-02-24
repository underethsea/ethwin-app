import Dapp from "./components/dapp.jsx"
import { MyConnect } from "./components/myConnect.jsx"
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import '@rainbow-me/rainbowkit/dist/index.css';
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import {
  chain,
  configureChains,
  createClient,
  WagmiConfig,
} from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

/* adding goerli network */
const goerliChain = {
  id: 5,
  name: 'Goerli',
  network: 'Goerli',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: `https://eth-goerli.alchemyapi.io/v2/${process.env.REACT_APP_ALCHEMY_KEY}`,
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://goerli.etherscan.io/' },
  },
  iconUrls: ["https://goerli.etherscan.io/images/go.svg"],
  testnet: true,
}

function App() {

  const { chains, provider } = configureChains(
    [chain.mainnet, goerliChain],
    [
      alchemyProvider({ apiKey: process.env.REACT_APP_ALCHEMY_KEY }),
      publicProvider()
    ]
  );

  const { connectors } = getDefaultWallets({
    appName: 'My RainbowKit App',
    chains
  });

  const wagmiClient = createClient({
    autoConnect: true,
    connectors,
    provider
  })

  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains} modalSize="compact" >
        {/* <img src="images/poolerson.png" className="top-left-image" /> */}
        <MyConnect label="Sign in" showBalance={{
          smallScreen: false,
          largeScreen: true,
        }} accountStatus={{
          smallScreen: 'avatar',
          largeScreen: 'full',
        }} />
        &nbsp;&nbsp;
        <Dapp />
        {/* <img src="./images/futurecity.jpeg" className="backdrop"></img> */}

        <div className="powered-by-div">
          <span className="sponsor-text-top">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sponsored & Powered By</span><br></br>
          <span><a href="https://witnet.io" target="_blank">
            <img src="./images/witnet.png" className="witnet" /></a>
          </span>
          <span>
            <a href="https://pooltogether.com" target="blank">
            <img src="./images/pooltogether.svg" className="pooltogether"/>
            </a>
          </span>
        </div>
        <div className="boticon">
          <span title="Github">
            <a href="https://github.com/underethsea/ethwin-app" target="_blank" rel="noreferrer">
              <img src="./images/github.png" className="github" alt="github"/>
            </a>
          </span>
          <span title="Discord">
            <a href="https://pooltogether.com/discord" target="_blank" rel="noreferrer">
              <img src="./images/discord.png" className="discord" alt="discord"/>
            </a>
          </span>
          <span title="Docs" >
            <a href="https://docs.steth.win" target="_blank" rel="noreferrer">
              <img src="./images/docs.png" className="docs" alt="docs"/>
            </a>
          </span>
        </div>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;