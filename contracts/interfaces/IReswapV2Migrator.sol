pragma solidity >=0.5.0;

interface IReswapV2Migrator {
    function migrate(address token, uint amountTokenMin, uint amountFTMMin, address to, uint deadline) external;
}
