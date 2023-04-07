const { getNamedAccounts, ethers } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    const { deployer } = await getNamedAccounts()
    const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    const daiTokenAddress = networkConfig[network.config.chainId].daiToken
    // wrap ETH
    await getWeth(deployer)
    const lendingPool = await getLendingPool(deployer)
    // approve
    await approveErc20(wethTokenAddress, lendingPool.address, ethers.utils.parseEther("1"), deployer)
    // deposit in Aave
    await lendingPool.deposit(wethTokenAddress, ethers.utils.parseEther("1"), deployer, 0)
    // Availabe to borrow in wei
    let { availableBorrowsETH } = await getBorrowUserData(lendingPool, deployer)

    const daiEthPrice = await getDaiPrice()
    console.log(`Available to borrow: ${availableBorrowsETH * (1 / daiEthPrice)} DAI`)
    // We will borrow 50% of the availableBorrowsETH in DAI
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.5 * (1 / daiEthPrice.toNumber())
    const amountDaiToBorrowInWei = availableBorrowsETH.toString() * 0.5
    console.log(`Borrowing 50% - ${amountDaiToBorrow} DAI`)
    console.log(`Borrowing 50% - ${amountDaiToBorrowInWei.toString()} WEI`)
    // Borrow DAI
    // console.log("Borrowing DAI......")
    // await lendingPool.borrow(daiTokenAddress, amountDaiToBorrowInWei.toString(), 1, 0, deployer)
    // const { totalDebtETH } = await getBorrowUserData(lendingPool, deployer)

    // console.log(`You borrowed ${totalDebtETH} WEI worth of DAI`)
    // // get deployer's DAI balance before repay
    // const daiErc20Token = await ethers.getContractAt("IERC20", daiTokenAddress, deployer)
    // const deployerDaiBalanceBeforeRepay = await daiErc20Token.balanceOf(deployer)
    // console.log(`Deployer's DAI balance before repay: ${deployerDaiBalanceBeforeRepay}`)

    // // Repay
    // await repayDai(lendingPool, daiTokenAddress, amountDaiToBorrowWei, deployer)
    // await getBorrowUserData(lendingPool, deployer)
}

async function repayDai(lendingPool, daiTokenAddress, amountToRepay, account) {
    // approve dai
    await approveErc20(daiTokenAddress, lendingPool.address, amountToRepay, account)
    console.log("Repaying DAI......")
    const repayTx = await lendingPool.repay(daiTokenAddress, amountToRepay, 1, account)
    await repayTx.wait(1)
}

// async function borrowDai(lendingPool, daiTokenAddress, amountToBorrow, account) {
//     console.log("Borrowing DAI......")
//     const borrowTx = await lendingPool.borrow(daiTokenAddress, amountToBorrow, 1, 0, account)
//     await borrowTx.wait(1)
// }

async function getDaiPrice() {
    // don't need to connect to deployer account since we are not sending any txs
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId].daiEthPriceFeed
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1] // answer
    // console.log(`This how much ETH you could buy with 1 DAI - ${ethers.utils.formatEther(price)}`)
    const ethPriceInDai = ethers.utils.parseEther("1").div(price)
    console.log(`Current price of 1 ETH in DAI - ${ethPriceInDai}`)
    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH, currentLiquidationThreshold, ltv, healthFactor } =
        await lendingPool.getUserAccountData(account)
    console.log(`Total Collateral: ${totalCollateralETH}`)
    console.log(`Total Debt: ${totalDebtETH}`)
    console.log(`Available to borrow: ${availableBorrowsETH}`)
    // console.log(`currentLiquidationThreshold: ${currentLiquidationThreshold.toString()}`)
    // console.log(`ltv: ${ltv.toString()}`)
    // console.log(`healthFactor: ${healthFactor.toString()}`)
    return { availableBorrowsETH, totalDebtETH }
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const txResponse = await erc20Token.approve(spenderAddress, amountToSpend)
    await txResponse.wait(1)
    const allowance = await erc20Token.allowance(account, spenderAddress)
    console.log(`Aave Token Allowance: ${allowance}`)
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

async function getWeth(account) {
    const iWeth = await ethers.getContractAt("IWeth", networkConfig[network.config.chainId].wethToken, account)
    const txResponse = await iWeth.deposit({
        value: ethers.utils.parseEther("1"),
    })
    await txResponse.wait(1)
    const wethBalance = await iWeth.balanceOf(account)
    console.log(`Got ${wethBalance} WETH`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
