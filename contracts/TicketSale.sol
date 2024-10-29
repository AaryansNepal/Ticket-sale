// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.17;

contract TicketSale {
    // Contract variables
    address public manager;
    uint public ticketPrice;
    uint public totalTickets;
    
    // Mapping to store ticket ownership
    mapping(address => uint) public ticketOwners;
    mapping(uint => address) public ticketToOwner;
    mapping(uint => bool) public soldTickets;
    
    // Swap related mappings
    mapping(address => mapping(address => uint)) public swapOffers;
    
    // Resale related mappings
    mapping(uint => uint) public ticketsForResale;
    
    // Events
    event TicketPurchased(address buyer, uint ticketId);
    event SwapOffered(address offerer, uint targetTicketId);
    event SwapCompleted(address party1, address party2, uint ticket1, uint ticket2);
    event TicketResaleListed(uint ticketId, uint price);
    event TicketResaleCompleted(address seller, address buyer, uint ticketId, uint price);
    
    constructor(uint numTickets, uint price) {
        require(numTickets > 0, "Number of tickets must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        
        manager = msg.sender;
        ticketPrice = price;
        totalTickets = numTickets;
    }
    
    function buyTicket(uint ticketId) public payable {
        require(ticketId > 0 && ticketId <= totalTickets, "Invalid ticket ID");
        require(!soldTickets[ticketId], "Ticket already sold");
        require(ticketOwners[msg.sender] == 0, "Buyer already owns a ticket");
        require(msg.value == ticketPrice, "Incorrect payment amount");
        
        soldTickets[ticketId] = true;
        ticketOwners[msg.sender] = ticketId;
        ticketToOwner[ticketId] = msg.sender;
        
        emit TicketPurchased(msg.sender, ticketId);
    }
    
    function getTicketOf(address person) public view returns (uint) {
        return ticketOwners[person];
    }
    
    function offerSwap(uint ticketId) public {
        require(ticketOwners[msg.sender] != 0, "Sender doesn't own a ticket");
        require(ticketToOwner[ticketId] != address(0), "Target ticket not sold");
        require(ticketToOwner[ticketId] != msg.sender, "Cannot swap with yourself");
        
        address targetOwner = ticketToOwner[ticketId];
        swapOffers[msg.sender][targetOwner] = ticketOwners[msg.sender];
        
        emit SwapOffered(msg.sender, ticketId);
    }
    
    function acceptSwap(uint ticketId) public {
        require(ticketOwners[msg.sender] != 0, "Acceptor doesn't own a ticket");
        address offerer = ticketToOwner[ticketId];
        require(swapOffers[offerer][msg.sender] != 0, "No valid swap offer");
        
        uint ticket1 = ticketOwners[msg.sender];
        uint ticket2 = ticketOwners[offerer];
        
        // Perform the swap
        ticketOwners[msg.sender] = ticket2;
        ticketOwners[offerer] = ticket1;
        ticketToOwner[ticket1] = offerer;
        ticketToOwner[ticket2] = msg.sender;
        
        // Clear the swap offer
        swapOffers[offerer][msg.sender] = 0;
        
        emit SwapCompleted(msg.sender, offerer, ticket1, ticket2);
    }
    
    function resaleTicket(uint price) public {
        require(ticketOwners[msg.sender] != 0, "Seller doesn't own a ticket");
        uint ticketId = ticketOwners[msg.sender];
        require(ticketsForResale[ticketId] == 0, "Ticket already listed for resale");
        
        ticketsForResale[ticketId] = price;
        
        emit TicketResaleListed(ticketId, price);
    }
    
    function acceptResale(uint ticketId) public payable {
        require(ticketsForResale[ticketId] > 0, "Ticket not listed for resale");
        require(ticketOwners[msg.sender] == 0, "Buyer already owns a ticket");
        require(msg.value == ticketsForResale[ticketId], "Incorrect payment amount");
        
        address seller = ticketToOwner[ticketId];
        uint price = ticketsForResale[ticketId];
        
        // Calculate fee and transfer amounts
        uint fee = (price * 10) / 100;  // 10% fee
        uint sellerAmount = price - fee;
        
        // Transfer ownership
        ticketOwners[msg.sender] = ticketId;
        ticketOwners[seller] = 0;
        ticketToOwner[ticketId] = msg.sender;
        
        // Remove resale listing
        ticketsForResale[ticketId] = 0;
        
        // Transfer payments
        payable(seller).transfer(sellerAmount);
        payable(manager).transfer(fee);
        
        emit TicketResaleCompleted(seller, msg.sender, ticketId, price);
    }
    
    function checkResale() public view returns (uint[] memory) {
        uint count = 0;
        
        // First count how many tickets are for resale
        for (uint i = 1; i <= totalTickets; i++) {
            if (ticketsForResale[i] > 0) {
                count++;
            }
        }
        
        // Create array of appropriate size
        uint[] memory resaleTickets = new uint[](count);
        uint index = 0;
        
        // Fill array with ticket IDs that are for resale
        for (uint i = 1; i <= totalTickets; i++) {
            if (ticketsForResale[i] > 0) {
                resaleTickets[index] = i;
                index++;
            }
        }
        
        return resaleTickets;
    }
}