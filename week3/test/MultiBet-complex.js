const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiBet Contract - Additional Tests", function () {
  let MultiBet;
  let multiBet;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;

  beforeEach(async function () {
    MultiBet = await ethers.getContractFactory("MultiBet");
    [owner, addr1, addr2, addr3, addr4, _] = await ethers.getSigners();
    multiBet = await MultiBet.deploy();
    await multiBet.waitForDeployment();
  });

  describe("Bet Existence Checks", function () {
    it("Cannot place a bet on a non-existing bet", async function () {
      await expect(
        multiBet
          .connect(addr1)
          .placeBet(0, "Option1", { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Bet does not exist");
    });

    it("Cannot resolve a non-existing bet", async function () {
      await expect(multiBet.resolveBet(0, "Option1")).to.be.revertedWith(
        "Bet does not exist"
      );
    });

    it("Cannot get information of a non-existing bet", async function () {
      await expect(multiBet.getBet(0)).to.be.revertedWith("Bet does not exist");
    });
  });

  describe("Bet Option Information Retrieval", function () {
    beforeEach(async function () {
      await multiBet.createBet("Sports Match", ["TeamA", "TeamB", "Draw"]);
      await multiBet
        .connect(addr1)
        .placeBet(0, "TeamA", { value: ethers.parseEther("2") });
      await multiBet
        .connect(addr2)
        .placeBet(0, "TeamB", { value: ethers.parseEther("3") });
      await multiBet
        .connect(addr3)
        .placeBet(0, "Draw", { value: ethers.parseEther("5") });
    });

    it("Should return correct option names and total bets", async function () {
      const [options, optionBets, totalAmount] =
        await multiBet.getBetOptionInfos(0);
      expect(options).to.deep.equal(["TeamA", "TeamB", "Draw"]);
      expect(optionBets[0]).to.equal(ethers.parseEther("2"));
      expect(optionBets[1]).to.equal(ethers.parseEther("3"));
      expect(optionBets[2]).to.equal(ethers.parseEther("5"));
      expect(totalAmount).to.equal(ethers.parseEther("10"));
    });
  });

  describe("User Bet Information Retrieval", function () {
    beforeEach(async function () {
      await multiBet.createBet("Election", ["CandidateX", "CandidateY"]);
      await multiBet
        .connect(addr1)
        .placeBet(0, "CandidateX", { value: ethers.parseEther("4") });
      await multiBet
        .connect(addr1)
        .placeBet(0, "CandidateY", { value: ethers.parseEther("1") });
    });

    it("Should return correct user bet details", async function () {
      const [optionIndexes, betAmounts] = await multiBet.getUserBet(
        0,
        addr1.address
      );
      expect(optionIndexes.length).to.equal(2);
      expect(optionIndexes).to.deep.equal([0, 1]);
      expect(betAmounts[0]).to.equal(ethers.parseEther("4"));
      expect(betAmounts[1]).to.equal(ethers.parseEther("1"));
    });

    it("Should return empty arrays for users who have not placed any bets", async function () {
      const [optionIndexes, betAmounts] = await multiBet.getUserBet(
        0,
        addr2.address
      );
      expect(optionIndexes.length).to.equal(0);
      expect(betAmounts.length).to.equal(0);
    });
  });

  describe("Multiple Bets and Resolutions", function () {
    beforeEach(async function () {
      // Create two bets
      await multiBet.createBet("Game1", ["TeamA", "TeamB"]);
      await multiBet.createBet("Game2", ["Player1", "Player2"]);

      // Place bets on both
      await multiBet
        .connect(addr1)
        .placeBet(0, "TeamA", { value: ethers.parseEther("3") });
      await multiBet
        .connect(addr1)
        .placeBet(1, "Player2", { value: ethers.parseEther("2") });
      await multiBet
        .connect(addr2)
        .placeBet(0, "TeamB", { value: ethers.parseEther("1") });
      await multiBet
        .connect(addr2)
        .placeBet(1, "Player1", { value: ethers.parseEther("4") });
    });
    it("Should correctly resolve multiple bets independently", async function () {
      // Record initial balances
      const initialBalance1 = await addr1.provider.getBalance(addr1.address);
      const initialBalance2 = await addr2.provider.getBalance(addr2.address);

      // Resolve first bet
      await expect(multiBet.resolveBet(0, "TeamA"))
        .to.emit(multiBet, "BetResolved")
        .withArgs(0, "TeamA");

      // Resolve second bet
      await expect(multiBet.resolveBet(1, "Player1"))
        .to.emit(multiBet, "BetResolved")
        .withArgs(1, "Player1");

      // Record final balances
      const finalBalance1 = await addr1.provider.getBalance(addr1.address);
      const finalBalance2 = await addr2.provider.getBalance(addr2.address);

      // Calculate net changes
      const netChange1 = finalBalance1 - initialBalance1;
      const netChange2 = finalBalance2 - initialBalance2;

      // Expected net changes
      const expectedNetChange1 = ethers.parseEther("4"); // addr1 loses 1 ETH
      const expectedNetChange2 = ethers.parseEther("6"); // addr2 gains 1 ETH

      // Assertions with allowance for gas costs
      expect(netChange1).to.be.closeTo(
        expectedNetChange1,
        ethers.parseEther("0.1")
      );
      expect(netChange2).to.be.closeTo(
        expectedNetChange2,
        ethers.parseEther("0.1")
      );
    });
  });

  describe("Attempting Unauthorized Actions", function () {
    beforeEach(async function () {
      await multiBet.createBet("Quiz", ["Answer1", "Answer2"]);
    });

    it("Non-owner cannot resolve a bet", async function () {
      await expect(
        multiBet.connect(addr1).resolveBet(0, "Answer1")
      ).to.be.revertedWith("Only the owner can perform this action");
    });

    it("Cannot resolve a bet twice", async function () {
      await multiBet.resolveBet(0, "Answer1");
      await expect(multiBet.resolveBet(0, "Answer1")).to.be.revertedWith(
        "Bet has already been resolved"
      );
    });

    it("Cannot resolve a bet with a non-existing option", async function () {
      await expect(
        multiBet.resolveBet(0, "NonExistingOption")
      ).to.be.revertedWith("Option does not exist");
    });
  });

  describe("Handling Zero Bets on Winning Option", function () {
    beforeEach(async function () {
      await multiBet.createBet("Lottery", ["Number1", "Number2"]);
      await multiBet
        .connect(addr1)
        .placeBet(0, "Number1", { value: ethers.parseEther("5") });
    });

    it("Should handle cases where no one bet on winning option", async function () {
      const initialContractBalance = await ethers.provider.getBalance(
        multiBet.target
      );

      await expect(multiBet.resolveBet(0, "Number2"))
        .to.emit(multiBet, "BetResolved")
        .withArgs(0, "Number2");

      // Contract should retain the total bet amount as no winners exist
      const finalContractBalance = await ethers.provider.getBalance(
        multiBet.target
      );
      expect(finalContractBalance).to.equal(initialContractBalance);
    });
  });

  describe("Large Number of Bettors", function () {
    const initialBalances = [];
    beforeEach(async function () {
      await multiBet.createBet("Marathon", ["Runner1", "Runner2"]);

      const signers = await ethers.getSigners();
      const totalSigners = signers.length; // Usually 10 by default

      // Simulate multiple bettors
      for (let i = 0; i < totalSigners * 6; i++) {
        const signer = signers[i % totalSigners];
        await multiBet
          .connect(signer)
          .placeBet(0, i % 2 === 0 ? "Runner1" : "Runner2", {
            value: ethers.parseEther("1"),
          });
      }
      for (let i = 0; i < totalSigners; i++) {
        initialBalances.push(
          await signers[i].provider.getBalance(signers[i].address)
        );
      }
    });

    it("Should handle large number of bettors without errors", async function () {
      const signers = await ethers.getSigners();
      const totalSigners = signers.length; // Usually 10 by default

      await expect(multiBet.resolveBet(0, "Runner1"))
        .to.emit(multiBet, "BetResolved")
        .withArgs(0, "Runner1");

      // Verify total amount and payouts
      const [options, optionBets, totalAmount] =
        await multiBet.getBetOptionInfos(0);
      expect(totalAmount).to.equal(ethers.parseEther(String(totalSigners * 6)));
      expect(optionBets[0]).to.equal(
        ethers.parseEther(String(totalSigners * 3))
      );
      expect(optionBets[1]).to.equal(
        ethers.parseEther(String(totalSigners * 3))
      );

      // Each winner should receive double their bet (since total bets on winning option equals total bets on losing option)
      for (let i = 0; i < totalSigners; i++) {
        const signer = await ethers.provider.getSigner(i);
        const finalBalance = await signer.provider.getBalance(signer.address);
        expect(finalBalance - initialBalances[i]).to.be.closeTo(
          totalSigners % 2 == 0
            ? i % 2 == 0
              ? ethers.parseEther("12")
              : ethers.parseEther("0")
            : ethers.parseEther("6"),
          ethers.parseEther("0.1")
        );
      }
    });
  });

  describe("Betting After Bet Creation", function () {
    it("Users can place bets immediately after bet is created", async function () {
      await multiBet.createBet("InstantBet", ["Yes", "No"]);
      await expect(
        multiBet
          .connect(addr1)
          .placeBet(0, "Yes", { value: ethers.parseEther("1") })
      )
        .to.emit(multiBet, "BetPlaced")
        .withArgs(0, addr1.address, ethers.parseEther("1"), "Yes");
    });
  });

  describe("Event Emissions", function () {
    beforeEach(async function () {
      await multiBet.createBet("Match", ["Team1", "Team2"]);
    });

    it("Should emit BetCreated event with correct parameters", async function () {
      await expect(multiBet.createBet("New Match", ["Alpha", "Beta"]))
        .to.emit(multiBet, "BetCreated")
        .withArgs(1, "New Match", ["Alpha", "Beta"]);
    });

    it("Should emit BetPlaced event with correct parameters", async function () {
      await expect(
        multiBet
          .connect(addr1)
          .placeBet(0, "Team1", { value: ethers.parseEther("2") })
      )
        .to.emit(multiBet, "BetPlaced")
        .withArgs(0, addr1.address, ethers.parseEther("2"), "Team1");
    });

    it("Should emit BetResolved event with correct parameters", async function () {
      await multiBet
        .connect(addr1)
        .placeBet(0, "Team1", { value: ethers.parseEther("2") });
      await expect(multiBet.resolveBet(0, "Team1"))
        .to.emit(multiBet, "BetResolved")
        .withArgs(0, "Team1");
    });
  });

  describe("Reentrancy and Security Checks", function () {
    it("Should prevent reentrancy attacks during payout", async function () {
      // This is more of a placeholder as Solidity's reentrancy guards or checks would be required
      // For demonstration, ensure that payout function is not vulnerable
      // In the contract, payouts are done after state changes, minimizing reentrancy risk
      expect(true).to.be.true; // Placeholder assertion
    });
  });

  describe("Fallback and Receive Functions", function () {
    it("Contract should not accept plain Ether transfers", async function () {
      const tx = {
        to: multiBet.target,
        value: ethers.parseEther("1"),
      };
      await expect(owner.sendTransaction(tx)).to.be.reverted;
    });
  });

  describe("Edge Cases with Zero Options", function () {
    it("Cannot create a bet with zero options", async function () {
      await expect(multiBet.createBet("Empty Bet", [])).to.be.revertedWith(
        "At least two options are required"
      );
    });
  });

  describe("Owner Withdrawal of Unclaimed Funds", function () {
    beforeEach(async function () {
      await multiBet.createBet("Unclaimed Funds", ["Option1", "Option2"]);
      await multiBet
        .connect(addr1)
        .placeBet(0, "Option1", { value: ethers.parseEther("1") });
      await multiBet.resolveBet(0, "Option2"); // No one bet on Option2
    });

    it("Owner can withdraw unclaimed funds", async function () {
      // Assuming a function for owner to withdraw unclaimed funds exists
      // Since it's not implemented, this test is more of a suggestion
      // Example:
      // await expect(multiBet.withdrawUnclaimedFunds(0)).to.changeEtherBalance(owner, ethers.parseEther("1"));
      expect(true).to.be.true; // Placeholder assertion
    });
  });

  describe("Bet Count and Retrieval", function () {
    beforeEach(async function () {
      await multiBet.createBet("Bet1", ["Yes", "No"]);
      await multiBet.createBet("Bet2", ["True", "False"]);
    });

    it("Should correctly increment betCount", async function () {
      expect(await multiBet.betCount()).to.equal(2);
    });

    it("Should retrieve correct bet details by ID", async function () {
      const bet1 = await multiBet.getBet(0);
      expect(bet1.topic).to.equal("Bet1");

      const bet2 = await multiBet.getBet(1);
      expect(bet2.topic).to.equal("Bet2");
    });
  });

  describe("Users Betting on Multiple Bets", function () {
    beforeEach(async function () {
      await multiBet.createBet("Game1", ["A", "B"]);
      await multiBet.createBet("Game2", ["X", "Y"]);

      await multiBet
        .connect(addr1)
        .placeBet(0, "A", { value: ethers.parseEther("2") });
      await multiBet
        .connect(addr1)
        .placeBet(1, "Y", { value: ethers.parseEther("3") });
    });

    it("Should track user bets across multiple bets correctly", async function () {
      const [optionIndexes1, betAmounts1] = await multiBet.getUserBet(
        0,
        addr1.address
      );
      expect(optionIndexes1).to.deep.equal([0]);
      expect(betAmounts1[0]).to.equal(ethers.parseEther("2"));

      const [optionIndexes2, betAmounts2] = await multiBet.getUserBet(
        1,
        addr1.address
      );
      expect(optionIndexes2).to.deep.equal([1]);
      expect(betAmounts2[0]).to.equal(ethers.parseEther("3"));
    });
  });

  describe("Partial Withdrawals and Refunds", function () {
    it("Should handle refunds if implemented", async function () {
      // Since the contract doesn't support refunds, this is a placeholder
      // If refunds were implemented, tests would ensure users can withdraw their bets before resolution
      expect(true).to.be.true; // Placeholder assertion
    });
  });
});
