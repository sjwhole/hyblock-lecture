const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();

  await counter.waitForDeployment();

  console.log("Counter deployed to:", await counter.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
