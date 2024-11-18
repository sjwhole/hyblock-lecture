// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultiBet {
    address public owner;

    constructor() {
        // TODO: Initialize the owner variable
        // Hint: Set the owner to the address that deploys the contract
    }

    struct Option {
        string name;
        uint256 totalAmount;
    }

    struct Bet {
        string topic;
        bool isResolved;
        uint256 totalAmount;
        uint256 winningOptionIndex;
        Option[] options;
        mapping(address => mapping(uint256 => uint256)) userOptionBetAmount; // User's bets per option
        mapping(address => bool) isBettor; // Tracks if a user has placed any bet
        address[] bettors;
    }

    mapping(uint256 => Bet) private bets;
    uint256 public betCount;

    event BetCreated(uint256 indexed betId, string topic, string[] options);
    event BetPlaced(uint256 indexed betId, address indexed user, uint256 amount, string option);
    event BetResolved(uint256 indexed betId, string winningOption);

    modifier onlyOwner() {
        // TODO: Restrict access to the owner
        // Hint: Use require to check if msg.sender is the owner
        _;
    }

    modifier betExists(uint256 betId) {
        // TODO: Check if a bet exists
        // Hint: Require that betId is less than betCount
        _;
    }

    function createBet(string memory _topic, string[] memory _options) public onlyOwner {
        // TODO:
        // - Ensure at least two options are provided
        // - Create a new Bet struct and store it in the bets mapping
        // - Initialize the options array within the Bet
        // - Emit the BetCreated event
        // - Increment betCount
    }

    function _findOptionIndex(Bet storage bet, string memory _option) internal view returns (uint256) {
        // TODO:
        // - Loop through bet.options to find the option with the matching name
        // - Return the index of the option if found
        // - Revert with an error if the option does not exist
    }

    function placeBet(uint256 betId, string memory _option) public payable betExists(betId) {
        // TODO:
        // - Retrieve the Bet from the bets mapping
        // - Ensure the bet is not resolved
        // - Ensure msg.value (the bet amount) is greater than zero
        // - Find the index of the chosen option using _findOptionIndex
        // - Update the totalAmount for the option and the bet
        // - Update the user's bet amount in userOptionBetAmount
        // - If the user hasn't bet before, mark them as a bettor and add to bettors array
        // - Emit the BetPlaced event
    }

    function resolveBet(uint256 betId, string memory _winningOption) public onlyOwner betExists(betId) {
        // TODO:
        // - Retrieve the Bet from the bets mapping
        // - Ensure the bet is not already resolved
        // - Find the index of the winning option using _findOptionIndex
        // - Mark the bet as resolved and store the winningOptionIndex
        // - Calculate the total amount bet on the winning option
        // - Loop through all bettors and distribute rewards proportionally
        // - Use call or transfer to send Ether to the winners
        // - Emit the BetResolved event
    }

    function getBetOptionInfos(uint256 betId)
    public
    view
    betExists(betId)
    returns (
        string[] memory options,
        uint256[] memory optionBets,
        uint256 totalAmount
    )
    {
        // TODO:
        // - Retrieve the Bet from the bets mapping
        // - Initialize arrays for options names and their corresponding total bets
        // - Populate the arrays with data from bet.options
        // - Return the arrays and the bet's totalAmount
    }

    function getBet(uint256 betId)
    public
    view
    betExists(betId)
    returns (
        string memory topic,
        bool isResolved,
        uint256 totalAmount,
        string memory winningOption
    )
    {
        // TODO:
        // - Retrieve the Bet from the bets mapping
        // - Return the topic, isResolved status, totalAmount, and winningOption (if resolved)
    }

    function getUserBet(uint256 betId, address user)
    public
    view
    betExists(betId)
    returns (
        uint256[] memory optionIndexes,
        uint256[] memory betAmounts
    )
    {
        // TODO:
        // - Retrieve the Bet from the bets mapping
        // - Determine the number of options the user has bet on
        // - Initialize arrays for optionIndexes and betAmounts
        // - Loop through the options to find the user's bet amounts
        // - Populate the arrays with the indexes and amounts
    }
}