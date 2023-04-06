const { getNamedAccounts, ethers } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    const { deployer } = await getNamedAccounts()
    await getWeth(deployer)
    const lendingPool = await getLendingPool(deployer)
    // deposit
    const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    // approve
    await approveErc20(wethTokenAddress, lendingPool.address, ethers.utils.parseEther("1"), deployer)
    console.log("Depositing...")
    await lendingPool.deposit(wethTokenAddress, ethers.utils.parseEther("1"), deployer, 0)
    console.log("Deposited!")
    // Borrow
    // How much we borrowed, have in collateral, and how much can we borrow?
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)
    // How much DAI can we borrow based on the ETH price?
    const daiEthPrice = await getDaiPrice()
    // We will borrow 95% of the availableBorrowsETH
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiEthPrice.toNumber())
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    const daiTokenAddress = networkConfig[network.config.chainId].daiToken
    await borrowDai(lendingPool, daiTokenAddress, amountDaiToBorrowWei, deployer)
    // How much we borrowed, have in collateral, and how much can we borrow?
    await getBorrowUserData(lendingPool, deployer)
    // Repay
    await repayDai(lendingPool, daiTokenAddress, amountDaiToBorrowWei, deployer)
}

async function repayDai(lendingPool, daiTokenAddress, amountToRepay, account) {
    console.log("Repaying DAI......")
    const repayTx = await lendingPool.repay(daiTokenAddress, amountToRepay, 1, account)
    await repayTx.wait(1)
}

async function borrowDai(lendingPool, daiTokenAddress, amountToBorrow, account) {
    console.log("Borrowing DAI......")
    const borrowTx = await lendingPool.borrow(daiTokenAddress, amountToBorrow, 1, 0, account)
    await borrowTx.wait(1)
}

async function getDaiPrice() {
    // don't need to connect to deployer account since we are not sending any txs
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        networkConfig[network.config.chainId].daiEthPriceFeed
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1] // answer
    console.log(`This how much ETH you could buy with 1 DAI - ${ethers.utils.formatEther(price)}`)
    const ethPriceInDai = ethers.utils.parseEther("1").div(price)
    console.log(`This how much DAI you could buy with 1 ETH i.e. price of 1 ETH - ${ethPriceInDai}`)
    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH, currentLiquidationThreshold, ltv, healthFactor } =
        await lendingPool.getUserAccountData(account)
    console.log(`totalCollateralETH: ${totalCollateralETH} in wei`)
    console.log(`totalDebtETH: ${totalDebtETH} in wei`)
    console.log(`availableBorrowsETH: ${availableBorrowsETH} in wei`)
    console.log(`currentLiquidationThreshold: ${currentLiquidationThreshold.toString()}`)
    console.log(`ltv: ${ltv.toString()}`)
    console.log(`healthFactor: ${healthFactor.toString()}`)
    return { availableBorrowsETH, totalDebtETH }
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const txResponse = await erc20Token.approve(spenderAddress, amountToSpend)
    await txResponse.wait(1)
    const allowance = await erc20Token.allowance(account, spenderAddress)
    console.log(`Allowance: ${ethers.utils.formatEther(allowance)}`)
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
    console.log(`Got ${ethers.utils.formatEther(wethBalance)} WETH`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
