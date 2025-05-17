# Default Foundry private key
DEFAULT_ANVIL_KEY := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

.PHONY: foundry_environment

foundry_environment:
	@echo "Deploying contract..."
	@forge script script/Updater.s.sol --broadcast --rpc-url http://127.0.0.1:8545 --private-key $(DEFAULT_ANVIL_KEY)
	@echo "Sending 1 ETH to the contract..."
	@cast send 0xD93Eff0A044dD8fd1609F20e48E76abBCE4c74bA --value 1ether --rpc-url http://localhost:8545 --private-key $(DEFAULT_ANVIL_KEY)
	@echo "Environment setup complete!"