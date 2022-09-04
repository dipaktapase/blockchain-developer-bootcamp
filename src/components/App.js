import { useEffect } from 'react';
import { useDispatch } from 'react-redux'
import config from '../config.json';
import { 
  loadProvider, 
  loadNetwork, 
  loadAccount,
  loadTokens, 
  loadExchange,
  subscribeToEvents,
  loadAllOrders
} from '../store/interactions';

import Navbar from './Navbar';
import Markets from './Markets';
import Balance from './Balance';
import Order from './Order';
import OrderBook from './OrderBook';

function App() {

  const dispatch = useDispatch()

  const loadBlockchainData = async () => {
    
    // connect Ethers to blockchain
    const provider = loadProvider(dispatch)

    //Fetch current network chain id ( eg. hardhat: 31337, kovan: 32)
    const chainId = await loadNetwork(provider, dispatch)

    // Reload page when network changes
    window.ethereum.on('chainChanged', () => {
      window.location.reload()
    })

    // Fetch current account & balance from Metamask When changed
    window.ethereum.on('accountsChanged', () => {
     loadAccount(provider, dispatch)
    })
    
    // Token smart contract
    const DApp = config[chainId].DApp
    const mETH = config[chainId].mETH
    await loadTokens(provider, [DApp.address, mETH.address], dispatch )

    // Exchange contract 
    const exchangeConfig = config[chainId].exchange
    const exchange = await loadExchange(provider, exchangeConfig.address, dispatch)

    // Fetch all orders: open, filled, cancelled
    loadAllOrders(provider, exchange, dispatch)

    // Listen to events
    subscribeToEvents(exchange, dispatch)
  }


  useEffect(() => {
    loadBlockchainData()
  })

  return (
    <div>

      <Navbar />

      <main className='exchange grid'>
        <section className='exchange__section--left grid'>

          <Markets />

          <Balance />

          <Order />

        </section>
        <section className='exchange__section--right grid'>

          {/* PriceChart */}

          {/* Transactions */}

          {/* Trades */}

          <OrderBook />

        </section>
      </main>

      {/* Alert */}

    </div>
  );
}

export default App;