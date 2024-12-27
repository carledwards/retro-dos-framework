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
	# Create docs directories if they don't exist
	mkdir -p docs/event-demo docs/foxpro-basic docs/input-demo docs/pixel-image docs/raw-buffer-demo
	# Build UI library demos
	cd packages/retro-ui-lib && npm run build:demos
	# Build FoxPro demo
	cd packages/retro-foxpro-ui && npm run build:demo

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
