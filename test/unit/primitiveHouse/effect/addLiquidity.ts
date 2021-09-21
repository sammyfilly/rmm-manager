import { waffle } from 'hardhat'
import { expect } from 'chai'
import { BytesLike, constants, utils } from 'ethers'

import { parseWei } from 'web3-units'
import loadContext, { DEFAULT_CONFIG } from '../../context'
import { addLiquidityFragment } from '../fragments'
import { computePoolId, getTokenId } from '../../../shared/utilities'

const { strike, sigma, maturity } = DEFAULT_CONFIG
let poolId: string

describe('allocate', function () {
  beforeEach(async function () {


    // poolId = computePoolId(this.engine.address, strike.raw, sigma.raw, maturity.raw)
  })

  describe('success cases', function () {
    describe('when adding liquidity from margin', function () {
      it('allocates 1 LP share', async function () {
        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          true
        )
      })

      it('increases the position of the sender', async function () {
        const tokenId = getTokenId(this.engine.address, poolId, 0)
        const liquidity = await this.house.balanceOf(this.deployer.address, tokenId)

        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          true
        )

        expect(
          await this.house.balanceOf(this.deployer.address, tokenId)
        ).to.equal(liquidity.add(parseWei('1').raw))
      })

      it('reduces the margin of the sender', async function () {
        const reserve = await this.engine.reserves(poolId)
        const deltaRisky = parseWei('1').mul(reserve.reserveRisky).div(reserve.liquidity)
        const deltaStable = parseWei('1').mul(reserve.reserveStable).div(reserve.liquidity)
        const initialMargin = await this.house.margins(this.engine.address, this.deployer.address)
        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          true
        )
        const newMargin = await this.house.margins(this.engine.address, this.deployer.address)

        expect(newMargin.balanceRisky).to.equal(initialMargin.balanceRisky.sub(deltaRisky.raw))
        expect(newMargin.balanceStable).to.equal(initialMargin.balanceStable.sub(deltaStable.raw))
      })

      it('emits the LiquidityAdded event', async function () {
        // TODO: Checks the args
        await expect(
          this.house.addLiquidity(
            this.risky.address,
            this.stable.address,
            poolId,
            parseWei('1').raw,
            true
          )
        ).to.emit(this.house, 'LiquidityAdded')
      })

      it('does not reduces the balances of the sender', async function () {
        const riskyBalance = await this.risky.balanceOf(this.deployer.address)
        const stableBalance = await this.stable.balanceOf(this.deployer.address)
        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          true
        )

        expect(await this.risky.balanceOf(this.deployer.address)).to.equal(riskyBalance)
        expect(await this.stable.balanceOf(this.deployer.address)).to.equal(stableBalance)
      })
    })

    describe('when allocating from external', async function () {
      it('allocates 1 LP shares', async function () {
        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          false,
        )
      })

      it('increases the position of the sender', async function () {
        const tokenId = getTokenId(this.engine.address, poolId, 0)
        const liquidity = await this.house.balanceOf(this.deployer.address, tokenId)

        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          false
        )

        expect(
          await this.house.balanceOf(this.deployer.address, tokenId)
        ).to.equal(liquidity.add(parseWei('1').raw))
      })

      it('reduces the balances of the sender', async function () {
        const reserve = await this.engine.reserves(poolId)
        const deltaRisky = parseWei('1').mul(reserve.reserveRisky).div(reserve.liquidity)
        const deltaStable = parseWei('1').mul(reserve.reserveStable).div(reserve.liquidity)
        const riskyBalance = await this.risky.balanceOf(this.deployer.address)
        const stableBalance = await this.stable.balanceOf(this.deployer.address)
        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          false
        )

        expect(await this.risky.balanceOf(this.deployer.address)).to.equal(riskyBalance.sub(deltaRisky.raw))
        expect(await this.stable.balanceOf(this.deployer.address)).to.equal(stableBalance.sub(deltaStable.raw))
      })

      it('does not reduces the margin', async function () {
        const initialMargin = await this.house.margins(this.engine.address, this.deployer.address)
        await this.house.addLiquidity(
          this.risky.address,
          this.stable.address,
          poolId,
          parseWei('1').raw,
          false
        )
        const newMargin = await this.house.margins(this.engine.address, this.deployer.address)

        expect(initialMargin.balanceRisky).to.equal(newMargin.balanceRisky)
        expect(initialMargin.balanceStable).to.equal(newMargin.balanceStable)
      })

      it('emits the LiquidityAdded event', async function () {
        // TODO: Checks the args
        await expect(
          this.house.addLiquidity(
            this.risky.address,
            this.stable.address,
            poolId,
            parseWei('1').raw,
            false
          )
        ).to.emit(this.house, 'LiquidityAdded')
      })
    })
  })

  describe('fail cases', function () {
    it('fails to allocate more than margin balance', async function () {
      await expect(this.house.connect(this.bob).addLiquidity(
        this.risky.address,
        this.stable.address,
        poolId,
        parseWei('100').raw,
        true
      )).to.be.reverted
    })

    it('fails to allocate more than external balances', async function () {
      await expect(this.house.connect(this.bob).addLiquidity(
        this.risky.address,
        this.stable.address,
        poolId,
        parseWei('1').raw,
        false
      )).to.be.reverted
    })

    it('reverts if the callback function is called directly', async function () {
      const data = utils.defaultAbiCoder.encode(
        ['address', 'address', 'address', 'uint256', 'uint256'],
        [this.house.address, this.risky.address, this.stable.address, '0', '0']
      );

      await expect(this.house.allocateCallback(0, 0, data)).to.be.revertedWith('NotEngineError()')
    })
  })
})
