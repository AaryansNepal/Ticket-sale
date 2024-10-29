const path = require('path');
const fs = require('fs');
const solc = require('solc');

// Get path to contract file
const contractPath = path.resolve(__dirname, 'contracts', 'TicketSale.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Configure compiler input
const input = {
    language: 'Solidity',
    sources: {
        'TicketSale.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*']
            }
        }
    }
};

try {
    // Compile the contract
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // Check for compilation errors
    if (output.errors) {
        output.errors.forEach(error => {
            console.log(error.formattedMessage);
        });
    }

    // Log the entire output for debugging
    console.log('Compilation output:', JSON.stringify(output, null, 2));

    // Check if compilation was successful
    if (!output.contracts || !output.contracts['TicketSale.sol'] || !output.contracts['TicketSale.sol'].TicketSale) {
        throw new Error('Contract compilation failed. Check your contract code and compiler version.');
    }

    const contract = output.contracts['TicketSale.sol'].TicketSale;

    // Write ABI to file
    fs.writeFileSync(
        'TicketSale_abi.json',
        JSON.stringify(contract.abi, null, 2)
    );

    // Write Bytecode to file
    fs.writeFileSync(
        'TicketSale_bytecode.txt',
        contract.evm.bytecode.object
    );

    console.log('\nCompilation successful!');
    console.log('\nContract ABI has been written to TicketSale_abi.json');
    console.log('Contract Bytecode has been written to TicketSale_bytecode.txt');

    // Export the compiled contract
    module.exports = {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };

} catch (error) {
    console.error('Compilation failed!');
    console.error(error);
    process.exit(1);
}