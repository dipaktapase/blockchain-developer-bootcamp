const { ethers } = require("hardhat");
const config = require("../src/config.json")


const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const wait = (seconds) => {
  const milliseconds = seconds * 1000
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function main() {
  // Fetch accounts form wallet - these are unlocked
  const accounts = await ethers.getSigners()

  // Fetch network
  const { chainId } = await ethers.provider.getNetwork()
  console.log("Using chainId", chainId)
  
  // Fetch deployed tokens
  const DApp = await ethers.getContractAt('Token', config[chainId].DApp.address)
  console.log(`Dapp Token fetched: ${DApp.address}\n`)
  
  const mETH = await ethers.getContractAt('Token', config[chainId].mETH.address)
  console.log(`mETH Token fetched: ${mETH.address}\n`)

  const mDAI = await ethers.getContractAt('Token', config[chainId].mDAI.address)
  console.log(`mDAI Token fetched: ${mDAI.address}\n`) 
  // Fetch the deployed exchange 
  const exchange = await ethers.getContractAt('Exchange', config[chainId].exchange.address)
  console.log(`Exchange fetched ${exchange.address}\n`)

  // Give tokens to account 1
  const sender = accounts[0]
  const receiver = accounts[1]
  let amount = tokens(10000)

  // user1 transfers 10,000 mETH...
  let transaction, result

  transaction = await mETH.connect(sender).transfer(receiver.address, amount)
  console.log(`Transferred ${amount} tokens from ${sender.address} to ${receiver.address}\n`)

  // Set up exchange users
  const user1 = accounts[0]
  const user2 = accounts[1]
  amount = tokens(10000)

  // User1 approves 10,000 Dapp...
  transaction = await DApp.connect(user1).approve(exchange.address, amount)
  await transaction.wait()
  console.log(`Approved ${amount} tokens from ${user1.address}`)

  // User1 deposit 10,000 Dapp...
  transaction = await exchange.connect(user1).depositToken(DApp.address, amount)
  await transaction.wait()
  console.log(`Deposited ${amount} Ether from ${user1.address}\n`)

  // User2 Approves mEth
  transaction = await mETH.connect(user2).approve(exchange.address, amount)
  await transaction.wait()
  console.log(`Approved ${amount} tokens from ${user2.address}`)

  // User2 deposit mEth
  transaction = await exchange.connect(user2).depositToken(mETH.address, amount)
  await transaction.wait()
  console.log(`Deposited ${amount} Ether from ${user2.address}\n`)

  //------------------------------------------------------------------//
  // Seed a Cancelled Order

  // User1 makes orde to get tokens
  let orderId
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), DApp.address, tokens(5))
  result = await transaction.wait()
  console.log(`Make order from ${user1.address}`)

  // User1 Cancels order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user1).cancelOrder(orderId)
  result = await transaction.wait()
  console.log(`Cancelled order form ${user1.address}\n`)

  // Wait 1 second
  await wait(1)

  // ------------------------------------------------------------------//
  // Seed filled Orders

  // User1 makes order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), DApp.address, tokens(10))
  result = await transaction.wait()
  console.log(`Make order from ${user1.address}`)

  // User2 Filled order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order from ${user1.address}`)

  // wait 1 second
  await wait(1)

  // User1 makes another order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(50), DApp.address, tokens(15))
  result = await transaction.wait()
  console.log(`Make order from ${user1.address}`)

  // User2 fill another order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order from ${user1.address}`)

  // wait 1 second
  await wait(1)

  // User1 makes a final order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(200), DApp.address, tokens(15))
  result = await transaction.wait()
  console.log(`Make order from ${user1.address}`)

  // User2 fill final order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order from ${user1.address}`)

  // wait 1 second
  await wait(1 )

  //---------------------------------------------------------------------------//
  // Seed Open Orders

  // User1 makes 10 orders
  for(let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(10 * i), DApp.address, tokens(10))
    result = await transaction.wait()

    console.log(`Made order from ${user1.address}`)
    
    // wait 1 second
    await wait(1)
  }

  // User2 makes makes 10 orders
  for(let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user2).makeOrder(DApp.address, tokens(10), mETH.address, tokens(10 * i))
    result = await transaction.wait()

    console.log(`Made order from ${user2.address}`)
    
    // wait 1 second
    await wait(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });