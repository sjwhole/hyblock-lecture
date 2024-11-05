const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Counter contract", function () {
  it("Increment 2 times and the count value should equals to 2", async function () {
    const hardhatCounter = await ethers.deployContract("Counter");

    await hardhatCounter.increment();
    await hardhatCounter.increment();

    expect(await hardhatCounter.getCount()).to.equal(2);
  });
});
