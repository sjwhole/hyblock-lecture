const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiBet Contract", function () {
  let MultiBet;
  let multiBet;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function () {
    MultiBet = await ethers.getContractFactory("MultiBet");
    [owner, addr1, addr2, addr3, _] = await ethers.getSigners();
    multiBet = await MultiBet.deploy();
    await multiBet.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await multiBet.owner()).to.equal(owner.address);
    });
  });

  describe("Creating Bets", function () {
    it("Owner can create a bet", async function () {
      const options = ["Option1", "Option2"];
      await expect(multiBet.createBet("Test Topic", options))
        .to.emit(multiBet, "BetCreated")
        .withArgs(0, "Test Topic", options);

      const betInfo = await multiBet.getBet(0);
      expect(betInfo.topic).to.equal("Test Topic");
      expect(betInfo.isResolved).to.be.false;
    });

    it("Non-owner cannot create a bet", async function () {
      const options = ["Option1", "Option2"];
      await expect(
        multiBet.connect(addr1).createBet("Test Topic", options)
      ).to.be.revertedWith("Only the owner can perform this action");
    });

    it("Cannot create a bet with less than two options", async function () {
      const options = ["Option1"];
      await expect(
        multiBet.createBet("Test Topic", options)
      ).to.be.revertedWith("At least two options are required");
    });
  });

  describe("Placing Bets", function () {
    beforeEach(async function () {
      await multiBet.createBet("Test Topic", ["Option1", "Option2", "Option3"]);
    });

    it("Users can place multiple bets on different options", async function () {
      await expect(
        multiBet
          .connect(addr1)
          .placeBet(0, "Option1", { value: ethers.parseEther("1") })
      )
        .to.emit(multiBet, "BetPlaced")
        .withArgs(0, addr1.address, ethers.parseEther("1"), "Option1");

      await expect(
        multiBet
          .connect(addr1)
          .placeBet(0, "Option2", { value: ethers.parseEther("2") })
      )
        .to.emit(multiBet, "BetPlaced")
        .withArgs(0, addr1.address, ethers.parseEther("2"), "Option2");

      const [optionIndexes, betAmounts] = await multiBet.getUserBet(
        0,
        addr1.address
      );
      expect(optionIndexes.length).to.equal(2);
      expect(optionIndexes[0]).to.equal(0); // Option1 index
      expect(optionIndexes[1]).to.equal(1); // Option2 index
      expect(betAmounts[0]).to.equal(ethers.parseEther("1"));
      expect(betAmounts[1]).to.equal(ethers.parseEther("2"));
    });

    it("Users can place multiple bets on the same option", async function () {
      await multiBet
        .connect(addr1)
        .placeBet(0, "Option1", { value: ethers.parseEther("1") });
      await multiBet
        .connect(addr1)
        .placeBet(0, "Option1", { value: ethers.parseEther("2") });

      const [optionIndexes, betAmounts] = await multiBet.getUserBet(
        0,
        addr1.address
      );
      expect(optionIndexes.length).to.equal(1);
      expect(optionIndexes[0]).to.equal(0); // Option1 index
      expect(betAmounts[0]).to.equal(ethers.parseEther("3")); // 1 + 2 ETH
    });

    it("Cannot place a bet on a non-existing option", async function () {
      await expect(
        multiBet
          .connect(addr1)
          .placeBet(0, "Option4", { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Option does not exist");
    });

    it("Cannot place a bet with zero amount", async function () {
      await expect(
        multiBet.connect(addr1).placeBet(0, "Option1", { value: 0 })
      ).to.be.revertedWith("Bet amount must be greater than zero");
    });
  });

  describe("Resolving Bets", function () {
    beforeEach(async function () {
      await multiBet.createBet("Test Topic", ["Option1", "Option2", "Option3"]);

      // addr1 bets 1 ETH on Option1 and 2 ETH on Option2
      await multiBet
        .connect(addr1)
        .placeBet(0, "Option1", { value: ethers.parseEther("1") });
      await multiBet
        .connect(addr1)
        .placeBet(0, "Option2", { value: ethers.parseEther("2") });

      // addr2 bets 3 ETH on Option2
      await multiBet
        .connect(addr2)
        .placeBet(0, "Option2", { value: ethers.parseEther("3") });

      // addr3 bets 4 ETH on Option3
      await multiBet
        .connect(addr3)
        .placeBet(0, "Option3", { value: ethers.parseEther("4") });
    });

    it("Owner can resolve a bet", async function () {
      await expect(multiBet.resolveBet(0, "Option2"))
        .to.emit(multiBet, "BetResolved")
        .withArgs(0, "Option2");

      const betInfo = await multiBet.getBet(0);
      expect(betInfo.isResolved).to.be.true;
      expect(betInfo.winningOption).to.equal("Option2");
    });

    it("Winners receive correct rewards when multiple bets are placed", async function () {
      const initialBalance1 = await addr1.provider.getBalance(addr1.address);
      const initialBalance2 = await addr2.provider.getBalance(addr2.address);

      const tx = await multiBet.resolveBet(0, "Option2");
      const receipt = await tx.wait();

      const finalBalance1 = await addr1.provider.getBalance(addr1.address);
      const finalBalance2 = await addr2.provider.getBalance(addr2.address);

      // Total pot is 10 ETH (1+2+3+4)
      // Total bets on Option2: 2+3 = 5 ETH
      // addr1 bet 2 ETH on Option2
      // addr2 bet 3 ETH on Option2

      // addr1's reward: (2 ETH / 5 ETH) * 10 ETH = 4 ETH
      // addr2's reward: (3 ETH / 5 ETH) * 10 ETH = 6 ETH

      const expectedReward1 = ethers.parseEther("4");
      const expectedReward2 = ethers.parseEther("6");

      // Adjust for gas used in the transaction
      const balanceDifference1 = finalBalance1 - initialBalance1;
      const balanceDifference2 = finalBalance2 - initialBalance2;

      expect(balanceDifference1).to.equal(expectedReward1);
      expect(balanceDifference2).to.equal(expectedReward2);
    });

    it("Users who didn't bet on winning option receive nothing", async function () {
      const initialBalance3 = await addr3.provider.getBalance(addr3.address);

      const tx = await multiBet.resolveBet(0, "Option2");
      await tx.wait();

      const finalBalance3 = await addr3.provider.getBalance(addr3.address);

      // addr3 should not receive any rewards
      expect(finalBalance3 - initialBalance3).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Cannot place a bet on a resolved bet", async function () {
      await multiBet.createBet("Test Topic", ["Option1", "Option2"]);
      await multiBet.resolveBet(0, "Option1");
      await expect(
        multiBet
          .connect(addr1)
          .placeBet(0, "Option1", { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Bet has been resolved");
    });

    it("Non-bettors do not receive rewards", async function () {
      await multiBet.createBet("Test Topic", ["Option1", "Option2"]);
      await multiBet
        .connect(addr1)
        .placeBet(0, "Option1", { value: ethers.parseEther("1") });
      const initialBalance2 = await addr2.provider.getBalance(addr2.address);
      await multiBet.resolveBet(0, "Option1");
      const finalBalance2 = await addr2.provider.getBalance(addr2.address);

      expect(finalBalance2 - initialBalance2).to.equal(0);
    });
  });
});
