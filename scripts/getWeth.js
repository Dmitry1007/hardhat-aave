// const { ethers, getNamedAccounts, network } = require("hardhat")
// const { networkConfig } = require("../helper-hardhat-config")

// async function getWeth() {
//     const { deployer } = await getNamedAccounts()
//     const iWeth = await ethers.getContractAt("IWeth", networkConfig[network.config.chainId].wethToken, deployer)
//     const txResponse = await iWeth.deposit({
//         value: ethers.utils.parseEther("1"),
//     })
//     await txResponse.wait(1)
//     const wethBalance = await iWeth.balanceOf(deployer)
//     console.log(`Got ${ethers.utils.formatEther(wethBalance)} WETH`)
// }

// module.exports = { getWeth }
