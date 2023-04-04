const { getWeth } = require("./getWeth")
const { getNamedAccounts } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

async function main() {
    await getWeth()
    const lendingPool = await getLendingPool()
    console.log(`LendingPool Address: ${lendingPool.address}`)
}

async function getLendingPool() {
    const { deployer } = await getNamedAccounts()
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        deployer
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, deployer)
    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
