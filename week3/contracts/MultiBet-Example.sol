// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultiBetExp {
    address public owner;

    constructor() {
        owner = msg.sender;
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
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    modifier betExists(uint256 betId) {
        require(betId < betCount, "Bet does not exist");
        _;
    }

    function createBet(string memory _topic, string[] memory _options) public onlyOwner {
        require(_options.length >= 2, "At least two options are required");

        Bet storage newBet = bets[betCount];
        newBet.topic = _topic;

        for (uint256 i = 0; i < _options.length; i++) {
            newBet.options.push(Option({name: _options[i], totalAmount: 0}));
        }

        emit BetCreated(betCount, _topic, _options);
        betCount++;
    }

    function _findOptionIndex(Bet storage bet, string memory _option) internal view returns (uint256) {
        for (uint256 i = 0; i < bet.options.length; i++) {
            if (
                keccak256(abi.encodePacked(bet.options[i].name)) ==
                keccak256(abi.encodePacked(_option))
            ) {
                return i;
            }
        }
        revert("Option does not exist");
    }

    function placeBet(uint256 betId, string memory _option) public payable betExists(betId) {
        Bet storage bet = bets[betId];
        require(!bet.isResolved, "Bet has been resolved");
        require(msg.value > 0, "Bet amount must be greater than zero");

        uint256 optionIndex = _findOptionIndex(bet, _option);

        bet.options[optionIndex].totalAmount += msg.value;
        bet.totalAmount += msg.value;
        bet.userOptionBetAmount[msg.sender][optionIndex] += msg.value;

        if (!bet.isBettor[msg.sender]) {
            bet.isBettor[msg.sender] = true;
            bet.bettors.push(msg.sender);
        }

        emit BetPlaced(betId, msg.sender, msg.value, _option);
    }

    function resolveBet(uint256 betId, string memory _winningOption) public onlyOwner betExists(betId) {
        Bet storage bet = bets[betId];
        require(!bet.isResolved, "Bet has already been resolved");

        uint256 winningOptionIndex = _findOptionIndex(bet, _winningOption);

        bet.isResolved = true;
        bet.winningOptionIndex = winningOptionIndex;

        uint256 totalWinnerBetAmount = bet.options[winningOptionIndex].totalAmount;

        if (totalWinnerBetAmount > 0) {
            for (uint256 i = 0; i < bet.bettors.length; i++) {
                address user = bet.bettors[i];
                uint256 userBet = bet.userOptionBetAmount[user][winningOptionIndex];
                if (userBet > 0) {
                    uint256 reward = (userBet * bet.totalAmount) / totalWinnerBetAmount;
                    (bool sent, ) = payable(user).call{value: reward}("");
                    require(sent, "Failed to send Ether");
                }
            }
        }

        emit BetResolved(betId, _winningOption);
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
        Bet storage bet = bets[betId];
        uint256 optionCount = bet.options.length;

        options = new string[](optionCount);
        optionBets = new uint256[](optionCount);

        for (uint256 i = 0; i < optionCount; i++) {
            options[i] = bet.options[i].name;
            optionBets[i] = bet.options[i].totalAmount;
        }

        totalAmount = bet.totalAmount;
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
        Bet storage bet = bets[betId];
        topic = bet.topic;
        isResolved = bet.isResolved;
        totalAmount = bet.totalAmount;
        if (isResolved) {
            winningOption = bet.options[bet.winningOptionIndex].name;
        } else {
            winningOption = "";
        }
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
        Bet storage bet = bets[betId];
        uint256 optionCount = bet.options.length;

        uint256 count = 0;
        for (uint256 i = 0; i < optionCount; i++) {
            if (bet.userOptionBetAmount[user][i] > 0) {
                count++;
            }
        }

        optionIndexes = new uint256[](count);
        betAmounts = new uint256[](count);

        uint256 index = 0;
        for (uint256 i = 0; i < optionCount; i++) {
            uint256 amount = bet.userOptionBetAmount[user][i];
            if (amount > 0) {
                optionIndexes[index] = i;
                betAmounts[index] = amount;
                index++;
            }
        }
    }
}