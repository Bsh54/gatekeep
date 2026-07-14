// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title GatekeepEscrow
/// @notice Attention-toll escrow for email. A stranger locks a small deposit to
///         reach a recipient. If the recipient replies, the sender is refunded.
///         If the recipient marks the message as spam, the deposit goes to a
///         public-goods address. If the deadline passes with no action, the
///         sender can reclaim the deposit. No party can ever divert the funds.
contract GatekeepEscrow {
    enum Status {
        None,
        Pending,
        Refunded, // recipient replied -> sender got funds back
        Donated, // recipient rejected -> funds sent to public goods
        Reclaimed // deadline passed -> sender took funds back
    }

    struct Message {
        address sender;
        address recipient;
        uint256 amount;
        uint256 deadline;
        Status status;
    }

    /// @notice Public-goods destination for rejected (spam) deposits. Immutable
    ///         so nobody — not even the owner — can redirect funds to themselves.
    address public immutable publicGoods;

    uint256 public nextId = 1;
    mapping(uint256 => Message) public messages;

    event Deposited(
        uint256 indexed id,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 deadline
    );
    event Refunded(uint256 indexed id, address indexed to, uint256 amount);
    event Donated(uint256 indexed id, address indexed publicGoods, uint256 amount);
    event Reclaimed(uint256 indexed id, address indexed to, uint256 amount);

    error InvalidRecipient();
    error ZeroDeposit();
    error BadDeadline();
    error NotFound();
    error NotPending();
    error NotRecipient();
    error NotSender();
    error DeadlinePassed();
    error DeadlineNotReached();
    error TransferFailed();

    constructor(address _publicGoods) {
        if (_publicGoods == address(0)) revert InvalidRecipient();
        publicGoods = _publicGoods;
    }

    /// @notice A sender locks a deposit to message `recipient`. `deadline` is the
    ///         unix timestamp by which the recipient should act (set from the
    ///         recipient's configured response window, enforced by the frontend).
    function deposit(address recipient, uint256 deadline)
        external
        payable
        returns (uint256 id)
    {
        if (recipient == address(0) || recipient == msg.sender) revert InvalidRecipient();
        if (msg.value == 0) revert ZeroDeposit();
        if (deadline <= block.timestamp) revert BadDeadline();

        id = nextId++;
        messages[id] = Message({
            sender: msg.sender,
            recipient: recipient,
            amount: msg.value,
            deadline: deadline,
            status: Status.Pending
        });

        emit Deposited(id, msg.sender, recipient, msg.value, deadline);
    }

    /// @notice Recipient replied — refund the sender their deposit.
    function refund(uint256 id) external {
        Message storage m = _pending(id);
        if (msg.sender != m.recipient) revert NotRecipient();
        m.status = Status.Refunded;
        emit Refunded(id, m.sender, m.amount);
        _send(m.sender, m.amount);
    }

    /// @notice Recipient marks the message as spam — deposit goes to public goods.
    function reject(uint256 id) external {
        Message storage m = _pending(id);
        if (msg.sender != m.recipient) revert NotRecipient();
        m.status = Status.Donated;
        emit Donated(id, publicGoods, m.amount);
        _send(publicGoods, m.amount);
    }

    /// @notice Deadline passed with no recipient action — sender reclaims funds.
    function reclaim(uint256 id) external {
        Message storage m = _pending(id);
        if (msg.sender != m.sender) revert NotSender();
        if (block.timestamp < m.deadline) revert DeadlineNotReached();
        m.status = Status.Reclaimed;
        emit Reclaimed(id, m.sender, m.amount);
        _send(m.sender, m.amount);
    }

    function getMessage(uint256 id) external view returns (Message memory) {
        return messages[id];
    }

    function _pending(uint256 id) private view returns (Message storage m) {
        m = messages[id];
        if (m.status == Status.None) revert NotFound();
        if (m.status != Status.Pending) revert NotPending();
    }

    function _send(address to, uint256 amount) private {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
