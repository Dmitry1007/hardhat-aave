const { getNamedAccounts, ethers } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    const { deployer } = await getNamedAccounts()
    await getWeth(deployer)
    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool Address: ${lendingPool.address}`)

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
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH, currentLiquidationThreshold, ltv, healthFactor } = await lendingPool.getUserAccountData(account)
    console.log(`totalCollateralETH: ${ethers.utils.formatEther(totalCollateralETH)}`)
    console.log(`totalDebtETH: ${ethers.utils.formatEther(totalDebtETH)}`)
    console.log(`availableBorrowsETH: ${ethers.utils.formatEther(availableBorrowsETH)}`)
    console.log(`currentLiquidationThreshold: ${currentLiquidationThreshold.toString()}`)
    console.log(`ltv: ${ltv.toString()}`)
    console.log(`healthFactor: ${healthFactor.toString()}`)
    return { availableBorrowsETH, totalDebtETH }
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

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const txResponse = await erc20Token.approve(spenderAddress, amountToSpend)
    await txResponse.wait(1)
    const allowance = await erc20Token.allowance(account, spenderAddress)
    console.log(`Allowance: ${ethers.utils.formatEther(allowance)}`)
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
