const { ethers } = require('hardhat')
const { expect } = require('chai')
const { transaction } = require('@openzeppelin/test-helpers/src/send')

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Exchange', () => {
  let exchange, deployer, accounts, feeAccount, token1, token2, user1, user2

  const feePercent = 10

  beforeEach(async () => {
    const Exchange = await ethers.getContractFactory('Exchange')
    const Token = await ethers.getContractFactory('Token')

    token1 = await Token.deploy('DAap University', 'DAPP', '1000000')
    token2 = await Token.deploy('Mock Dai', 'mDai', '1000000')

    accounts = await ethers.getSigners()
    deployer = accounts[0]
    feeAccount = accounts[1]
    user1 = accounts[2]
    user2 = accounts[3]

    let transaction = await token1.connect(deployer).transfer(user1.address, tokens(100))
    await transaction.wait()
    
    exchange = await Exchange.deploy(feeAccount.address, feePercent) 
  }) 

  describe('Deployment', () => {

    it('tracks the fee account', async () => {
      expect(await exchange.feeAccount()).to.equal(feeAccount.address)
    })

    it('Tracks the fee percent', async () => {
      expect(await exchange.feePercent()).to.equal(feePercent)
    }) 
  }) 

  describe('Depositing Tokens', async () => {  
    let transaction, result 
    let amount = tokens(10)

    describe('Success', async () => {

      beforeEach(async () => {
        transaction = await token1.connect(user1).approve(exchange.address, amount)
        result = await transaction.wait()
         
        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()
      }) 

      it('Tracks the token deposit', async () => {
        expect(await token1.balanceOf(exchange.address)).to.equal(amount)
        expect(await exchange.tokens(token1.address, user1.address)).to.equal(amount)
        expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)
      })

      it('Emits a Deposit event', async () => {
        const event = result.events[1] // 2 events are emitted
        expect(event.event).to.equal('Deposit')
        const args = event.args
        expect(args.token).to.equal(token1.address)
        expect(args.user).to.equal(user1.address)
        expect(args.amount).to.equal(amount)
        expect(args.balance).to.equal(amount)
      })
    })

    describe('Failure', async () => {
      it('fails when no tokens are approved', async () => {
        await expect(exchange.connect(user1).depositToken(token1.address, amount)).to.be.reverted
      })
    })
  })

  describe('Withdrawing Tokens', async () => {  
    let transaction, result 
    let amount = tokens(10)

    describe('Success', async () => {

      beforeEach(async () => {
        // Deposit tokens before withdrawing
        // Approving Tokens
        transaction = await token1.connect(user1).approve(exchange.address, amount)
        result = await transaction.wait()
         
        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()

        // Now withdraw Tokens
        transaction = await exchange.connect(user1).withdrawToken(token1.address, amount)
        result = await transaction.wait()
      }) 

      it('Withdraw token funds', async () => {
        expect(await token1.balanceOf(exchange.address)).to.equal(0)
        expect(await exchange.tokens(token1.address, user1.address)).to.equal(0)
        expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(0)
      })

      it('Emits a Withdraw event', async () => {
        const event = result.events[1] // 2 events are emitted
        expect(event.event).to.equal('Withdraw')
        const args = event.args
        expect(args.token).to.equal(token1.address)
        expect(args.user).to.equal(user1.address)
        expect(args.amount).to.equal(amount)
        expect(args.balance).to.equal(0)
      })
    })

    describe('Failure', async () => {
      it('fails for insufficient balances', async () => {
        await expect(exchange.connect(user1).withdrawToken(token1.address, amount)).to.be.reverted

      })
    })
  })

  describe('Checking balances', async () => {  
    let transaction, result 
    let amount = tokens(1)

      beforeEach(async () => {
        // Approve Token
        transaction = await token1.connect(user1).approve(exchange.address, amount)
        result = await transaction.wait()
        // Deposit Token
        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()
      }) 

      it('returns user balnace', async () => {
        expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)
      })

  })

  describe('Making orders', async () => {

    let transaction, result
    let amount = tokens(1)

    describe('success', async() => {
        beforeEach(async () => {
        // Deposit tokens before making order
        // Approving Tokens
        transaction = await token1.connect(user1).approve(exchange.address, amount)
        result = await transaction.wait()
        // Deposit token
        transaction = await exchange.connect(user1).depositToken(token1.address, amount)
        result = await transaction.wait()
        // Make order
        transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
        result = await transaction.wait()
        })

        it('Tracks the newly created order', async () => {
          expect(await exchange.orderCount()).to.equal(1)
        })

        it('Emit an Order event', async () => {
          const event = result.events[0]
          expect(event.event).to.equal('Order')

          const args = event.args
          expect(args.id).to.equal(1)
          expect(args.user).to.equal(user1.address)
          expect(args.tokenGet).to.equal(token2.address)
          expect(args.amountGet).to.equal(tokens(1))
          expect(args.tokenGive).to.equal(token1.address)
          expect(args.amountGive).to.equal(tokens(1))
          expect(args.timestamp).to.at.least(1)
        })
    })

    describe('Failure', async () => {
      it('Rejects with no balnace', async () => {
        await expect(exchange.connect(user1).makeOrder(token2.address, tokens(1), token1.address, tokens(1))).to.be.reverted
      })
    })
  })
  
  describe('Order actions', async () => {
    let transaction, result
    let amount = tokens(1)

    beforeEach(async () => {
      // user1 deposit tokens
      transaction = await token1.connect(user1).approve(exchange.address, amount)
      result = await transaction.wait()

      transaction = await exchange.connect(user1).depositToken(token1.address, amount)
      result = await transaction.wait()

      transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
      result = await transaction.wait()
    })
    
    describe('Cancelling orders', async () => {

      describe('Success', async () => {
        beforeEach(async () => {
          transaction = await exchange.connect(user1).cancelOrder(1)
          result = await transaction.wait()
        })

        it('Updates cancelled orders', async () => {
          expect(await exchange.orderCancelled(1)).to.equal(true)
        })

        it('Emits Cancel event', async () => {
          const event = result.events[0]
          expect(event.event).to.equal('Cancel')

          const args = event.args
          expect(args.id).to.equal(1)
          expect(args.user).to.equal(user1.address)
          expect(args.tokenGet).to.equal(token2.address)
          expect(args.amountGet).to.equal(tokens(1))
          expect(args.tokenGive).to.equal(token1.address)
          expect(args.amountGive).to.equal(tokens(1))
          expect(args.timestamp).to.at.least(1)
        }) 
      })

      describe('Failure', async () => {
        beforeEach(async () => {
          transaction = await token1.connect(user1).approve(exchange.address, amount)
          result = await transaction.wait()

          transaction = await exchange.connect(user1).depositToken(token1.address, amount)
          result = await transaction.wait()

          transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
          result = await transaction.wait()
        })

        it('Rejects invalid user id', async () => {
          const invalidOrderId = 9999 
          await expect(exchange.connect(user1).cancelOrder(invalidOrderId)).to.be.reverted
        })

        it('Rejects unathorized cancellation', async () => {
          await expect(exchange.connect(user2).cancelOrder(1)).to.be.reverted
        })
      })
    })
  })

}) 