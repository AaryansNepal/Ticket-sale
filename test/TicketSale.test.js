const assert = require('assert');
const ganache = require('ganache');
const Web3 = require('web3');
// Initialize Web3 with Ganache provider
const web3 = new Web3(ganache.provider());
const { abi, bytecode } = require('../compile');

let accounts;
let ticketSale;
const TICKET_PRICE = '100000000000000000'; // 0.1 ETH in wei
const TOTAL_TICKETS = 100;

beforeEach(async () => {
    // Get a list of all accounts
    accounts = await web3.eth.getAccounts();
    
    // Deploy the contract before each test
    ticketSale = await new web3.eth.Contract(abi)
        .deploy({
            data: bytecode,
            arguments: [TOTAL_TICKETS, TICKET_PRICE]
        })
        .send({ from: accounts[0], gas: '3000000' });
});

describe('TicketSale Contract', () => {
    it('deploys a contract', () => {
        assert.ok(ticketSale.options.address);
    });

    it('marks caller as the manager', async () => {
        const manager = await ticketSale.methods.manager().call();
        assert.equal(manager, accounts[0]);
    });

    describe('Ticket Purchase', () => {
        it('allows a user to buy a ticket', async () => {
            const gasEstimate = await ticketSale.methods.buyTicket(1).estimateGas({ from: accounts[1], value: TICKET_PRICE });
            await ticketSale.methods.buyTicket(1)
                .send({
                    from: accounts[1],
                    value: TICKET_PRICE,
                    gas: gasEstimate
                });

            const ticketOwner = await ticketSale.methods.getTicketOf(accounts[1]).call();
            assert.equal(ticketOwner, '1');
        });

        it('prevents buying already sold tickets', async () => {
            const gasEstimate1 = await ticketSale.methods.buyTicket(1).estimateGas({ from: accounts[1], value: TICKET_PRICE });
            await ticketSale.methods.buyTicket(1)
                .send({
                    from: accounts[1],
                    value: TICKET_PRICE,
                    gas: gasEstimate1
                });

            try {
                const gasEstimate2 = await ticketSale.methods.buyTicket(1).estimateGas({ from: accounts[2], value: TICKET_PRICE });
                await ticketSale.methods.buyTicket(1)
                    .send({
                        from: accounts[2],
                        value: TICKET_PRICE,
                        gas: gasEstimate2
                    });
                assert(false);
            } catch (err) {
                assert(err);
            }
        });
    });

    describe('Ticket Swapping', () => {
        beforeEach(async () => {
            // Setup: Two users buy tickets
            const gasEstimate1 = await ticketSale.methods.buyTicket(1).estimateGas({ from: accounts[1], value: TICKET_PRICE });
            await ticketSale.methods.buyTicket(1)
                .send({
                    from: accounts[1],
                    value: TICKET_PRICE,
                    gas: gasEstimate1
                });
            
            const gasEstimate2 = await ticketSale.methods.buyTicket(2).estimateGas({ from: accounts[2], value: TICKET_PRICE });
            await ticketSale.methods.buyTicket(2)
                .send({
                    from: accounts[2],
                    value: TICKET_PRICE,
                    gas: gasEstimate2
                });
        });

        it('allows users to offer and accept swaps', async () => {
            const gasEstimateOffer = await ticketSale.methods.offerSwap(2).estimateGas({ from: accounts[1] });
            await ticketSale.methods.offerSwap(2)
                .send({ from: accounts[1], gas: gasEstimateOffer });

            const gasEstimateAccept = await ticketSale.methods.acceptSwap(1).estimateGas({ from: accounts[2] });
            await ticketSale.methods.acceptSwap(1)
                .send({ from: accounts[2], gas: gasEstimateAccept });

            const ticket1Owner = await ticketSale.methods.getTicketOf(accounts[2]).call();
            const ticket2Owner = await ticketSale.methods.getTicketOf(accounts[1]).call();

            assert.equal(ticket1Owner, '1');
            assert.equal(ticket2Owner, '2');
        });
    });

    describe('Ticket Resale', () => {
        beforeEach(async () => {
            // Setup: User buys a ticket
            const gasEstimate = await ticketSale.methods.buyTicket(1).estimateGas({ from: accounts[1], value: TICKET_PRICE });
            await ticketSale.methods.buyTicket(1)
                .send({
                    from: accounts[1],
                    value: TICKET_PRICE,
                    gas: gasEstimate
                });
        });

        it('allows users to list tickets for resale', async () => {
            const resalePrice = '150000000000000000'; // 0.15 ETH in wei
            const gasEstimate = await ticketSale.methods.resaleTicket(resalePrice).estimateGas({ from: accounts[1] });
            await ticketSale.methods.resaleTicket(resalePrice)
                .send({ from: accounts[1], gas: gasEstimate });

            const resaleTickets = await ticketSale.methods.checkResale().call();
            assert(resaleTickets.includes('1'));
        });

        it('allows users to buy resale tickets with correct fee distribution', async () => {
            const resalePrice = '200000000000000000'; // 0.2 ETH in wei
            
            // List ticket for resale
            const gasEstimateList = await ticketSale.methods.resaleTicket(resalePrice).estimateGas({ from: accounts[1] });
            await ticketSale.methods.resaleTicket(resalePrice)
                .send({ from: accounts[1], gas: gasEstimateList });

            // New user buys the resale ticket
            const gasEstimateBuy = await ticketSale.methods.acceptResale(1).estimateGas({ from: accounts[2], value: resalePrice });
            await ticketSale.methods.acceptResale(1)
                .send({
                    from: accounts[2],
                    value: resalePrice,
                    gas: gasEstimateBuy
                });

            // Check new ownership
            const newOwner = await ticketSale.methods.getTicketOf(accounts[2]).call();
            assert.equal(newOwner, '1');
        });
    });
});
