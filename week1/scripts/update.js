const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Incrementing Counter with the account:", deployer.address);

  const Counter = await ethers.getContractFactory("Counter");
  const contractAddress = "YOUR_CONTRACT_ADDRESS";
  const counter = Counter.attach(contractAddress);

  // First increment
  console.log("Sending first increment transaction...");
  const tx1 = await counter.increment();
  await tx1.wait(); // Wait for first transaction to be confirmed
  console.log("First increment confirmed");

  // Second increment
  console.log("Sending second increment transaction...");
  const tx2 = await counter.increment();
  await tx2.wait(); // Wait for second transaction to be confirmed
  console.log("Second increment confirmed");

  // Get final count
  const count = await counter.getCount();
  console.log("Counter incremented to:", count.toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
