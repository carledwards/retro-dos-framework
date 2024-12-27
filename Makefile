.PHONY: install build clean build-demos serve-demos

# Default target
all: install build build-demos

# Install dependencies
install:
	npm install

# Build all packages
build:
	npm run build

# Clean build artifacts
clean:
	npm run clean

# Build all demos for GitHub Pages
build-demos:
	# Clean up any existing docs
	rm -rf docs/* packages/*/docs
	# Create root docs directories
	mkdir -p docs/event-demo docs/foxpro-basic docs/input-demo docs/pixel-image docs/raw-buffer-demo
	# Build UI library demos and ensure they're in the root docs directory
	VITE_BUILD_OUTDIR="$(PWD)/docs" cd packages/retro-ui-lib && \
		npx vite build examples/pixel-image --outDir "$(PWD)/docs/pixel-image" --base ./ --config examples/pixel-image/vite.config.ts && \
		npx vite build examples/event-demo --outDir "$(PWD)/docs/event-demo" --base ./ --config examples/event-demo/vite.config.ts && \
		npx vite build examples/input-demo --outDir "$(PWD)/docs/input-demo" --base ./ --config examples/input-demo/vite.config.ts && \
		npx vite build examples/raw-buffer-demo --outDir "$(PWD)/docs/raw-buffer-demo" --base ./ --config examples/raw-buffer-demo/vite.config.ts
	# Build FoxPro demo and ensure it's in the root docs directory
	VITE_BUILD_OUTDIR="$(PWD)/docs" cd packages/retro-foxpro-ui && \
		npx vite build examples/basic-demo --outDir "$(PWD)/docs/foxpro-basic" --base ./ --config examples/basic-demo/vite.config.ts

# Serve demos locally
serve-demos: build-demos
	cd docs && python3 -m http.server 8000

# Development mode
dev:
	npm run dev

# Run tests
test:
	npm run test

# Individual demo targets
# Individual demo targets
demo-foxpro:
	cd packages/retro-foxpro-ui && npm run example:basic

demo-event:
	cd packages/retro-ui-lib && npm run demo:event

demo-input:
	cd packages/retro-ui-lib && npm run demo:input

demo-raw-buffer:
	cd packages/retro-ui-lib && npm run demo:raw-buffer

demo-pixel:
	cd packages/retro-ui-lib && npm run demo:pixel-image

# Format code
format:
	npm run format
