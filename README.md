# Retro DOS Framework

A modern implementation of a retro-style video buffer system with a FoxPro-like UI framework, designed for building games and applications with a DOS-era aesthetic.

## Live Demos

All demos are available online at [https://carledwards.github.io/retro-dos-framework/](https://carledwards.github.io/retro-dos-framework/)

- **FoxPro UI Demo**: Basic window management and UI components demo
- **Event Demo**: Event handling system demonstration
- **Input Demo**: Keyboard and mouse input handling
- **Raw Buffer Demo**: Low-level buffer manipulation
- **Pixel Image Demo**: Convert and manipulate images with different color palettes

### Building and Running Demos

The project includes a Makefile to simplify common operations. Here are the main commands:

```bash
# Install dependencies and build everything
make

# Build demos for GitHub Pages
make build-demos

# Serve demos locally (builds demos first)
make serve-demos

# Run individual demos in development mode
make demo-foxpro      # FoxPro UI demo
make demo-event       # Event handling demo
make demo-input      # Input handling demo
make demo-raw-buffer # Raw buffer demo
make demo-pixel      # Pixel image demo

# Format code
make format
```

You can also run commands directly:

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build demos manually
cd packages/retro-ui-lib
npm run build:demos
cd ../retro-foxpro-ui
npm run build:demo

# Serve demos locally
cd docs && python3 -m http.server 8000
```

## Project Structure

```
retro-dos-framework/
├── packages/
│   ├── retro-ui-lib/          # Core UI library
│   │   ├── src/               # Source files
│   │   │   ├── events/        # Event system
│   │   │   ├── input/         # Input handling
│   │   │   ├── rendering/     # Core rendering
│   │   │   ├── types/         # Common types
│   │   │   └── video/         # Video buffer
│   │   └── examples/          # Example applications
│   │       ├── event-demo/    # Event system demo
│   │       ├── input-demo/    # Input handling demo
│   │       ├── pixel-image/   # Image manipulation demo
│   │       └── raw-buffer-demo/ # Buffer demo
│   └── retro-foxpro-ui/       # FoxPro-style UI framework
│       ├── src/               # Source files
│       └── examples/          # Example applications
│           └── basic-demo/    # Window management demo
```

## Packages

- [@retro-dos/retro-ui-lib](./packages/retro-ui-lib/README.md) - Core UI library
  - Video buffer implementation
  - Input handling (keyboard and mouse)
  - Event management system
  - Layer-based rendering with dirty region tracking
  - DOS-style cursor management
  - Spatial partitioning for efficient updates
- [@retro-dos/foxpro-ui](./packages/retro-foxpro-ui/README.md) - FoxPro-style UI framework

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run development mode
npm run dev

# Run tests
npm run test

# Format code
npm run format
```

## Performance Optimizations

The framework includes several performance optimizations:

1. Dirty Region Tracking
   - Only updates regions that have actually changed
   - Uses QuadTree for efficient spatial partitioning
   - Merges adjacent regions to minimize draw calls
   - Zero overhead when content is static

2. Layer Management
   - Abstract base layer system for UI implementations
   - Independent layer updates and caching
   - Efficient compositing with z-index ordering
   - Support for off-screen content

3. Cursor Management
   - Efficient cursor blinking with minimal redraws
   - Color inversion with underlying content preservation
   - Auto-hiding for performance optimization
   - Position-based update skipping

4. Batch Operations
   - Groups multiple write operations
   - Automatically merges adjacent regions
   - Reduces overall redraw overhead

## Contributing

This project is structured as a monorepo using Turborepo. Each package is designed to be eventually separated into its own repository while maintaining compatibility through clear interfaces.

The core UI library (@retro-dos/retro-ui-lib) provides base components that can be extended to create different UI implementations. The FoxPro UI serves as an example of how to build upon these core components.

## License

MIT
