# Fuse Margin Trading

The Fuse margin trading contracts allow you to open and close leveraged longs/shorts on any asset in 1 click.

Mainnet deployments:

```
FuseMarginController: 0x3735Be391814ADf23A7C46a02B4A2B4259af30bF
PositionProxy: 0xeb86a0b9d8990748303c1194292A000aCcA76824
ConnectorV1: 0x2A961BB3809c7C68896E27D6E8f95cAcEEBfC406
FuseMarginV1: 0xdC3d8ba3CBDa63953DE5456ae0a1a13E5cC796E8
```

## Compile

First fill out the environment variables in `.env` following the `.env.sample` template. Then run:

```
yarn compile
```

## Test

```
yarn test
```

## Deploy

```
yarn evm
yarn deploy
```
