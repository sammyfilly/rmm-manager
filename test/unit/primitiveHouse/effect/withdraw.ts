import { waffle } from 'hardhat'
import { expect } from 'chai'
import { BytesLike, constants } from 'ethers'

import { parseWei } from '../../../shared/Units'
import loadContext from '../../context'

import { withdrawFragment } from '../fragments'

const empty: BytesLike = constants.HashZero

describe('withdraw', function () {
  before(async function () {
    await loadContext(waffle.provider, withdrawFragment)
  })

  describe('when the parameters are valid', function () {
    it('withdraws 1000 risky and 1000 stable from margin', async function () {
      await this.contracts.house.withdraw(
        this.contracts.risky.address,
        this.contracts.stable.address,
        parseWei('1000').raw,
        parseWei('1000').raw
      )
    })

    it('reduces the margin of the sender', async function () {
      await this.contracts.house.withdraw(
        this.contracts.risky.address,
        this.contracts.stable.address,
        parseWei('1000').raw,
        parseWei('1000').raw
      )

      const margin = await this.contracts.house.margins(this.contracts.engine.address, this.signers[0].address)

      expect(margin.balanceRisky).to.equal(parseWei('99000').raw)
      expect(margin.balanceStable).to.equal(parseWei('99000').raw)
    })

    it('emits the Withdrawn event', async function () {
      await expect(
        this.contracts.house.withdraw(
          this.contracts.risky.address,
          this.contracts.stable.address,
          parseWei('1000').raw,
          parseWei('1000').raw
        )
      )
        .to.emit(this.contracts.house, 'Withdrawn')
        .withArgs(this.signers[0].address, this.contracts.engine.address, parseWei('1000').raw, parseWei('1000').raw)
    })
  })

  describe('fail cases', function () {
    it('fails on attempt to withdraw more than margin balance', async function () {
      await expect(
        this.contracts.house.withdraw(
          this.contracts.risky.address,
          this.contracts.stable.address,
          parseWei('100001').raw,
          parseWei('100001').raw
        )
      ).to.be.reverted
    })

    it('reverts if the callback function is called directly', async function () {
      await expect(this.contracts.house.depositCallback(0, 0, empty)).to.be.revertedWith('Not engine')
    })
  })
})
