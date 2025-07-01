# Filament Inventory Tracker

A modern web application for tracking 3D printing filament inventory with support for custom brands, types, and colors.

## Features

- **Inventory Management**: Track filament brand, type, color, spool type, weight, and purchase date
- **Custom Data**: Add custom brands, types, and colors through a centralized management interface
- **Search & Filter**: Quick search across all filament properties
- **Mobile Friendly**: Responsive design that works on all devices
- **Data Persistence**: SQLite database ensures data survives restarts
- **Kubernetes Ready**: Includes K8s deployment manifests
- **Multi-Architecture**: Docker images for Linux (amd64, arm64)

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd filament-inventory-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Docker

```bash
docker run -d \
  --name filament-tracker \
  -p 3000:3000 \
  -v filament-data:/app/data \
  ghcr.io/yourusername/filament-inventory-tracker:latest
```

### Kubernetes Deployment

1. **Apply the manifests**
   ```bash
   kubectl apply -f k8s/
   ```

2. **Access the application**
   ```bash
   kubectl port-forward service/filament-tracker 3000:3000
   ```

## Multi-Architecture Docker Images

This project automatically builds Docker images for multiple architectures using GitHub Actions:

### Supported Platforms

- **Linux AMD64** (`linux/amd64`) - Standard x86_64 systems
- **Linux ARM64** (`linux/arm64`) - ARM64 systems (Apple Silicon, AWS Graviton, etc.)

### GitHub Workflow

The `.github/workflows/docker-build.yml` workflow automatically:

1. **Triggers on**:
   - Push to `main` branch
   - New tags (e.g., `v1.0.0`)
   - Pull requests (build only, no push)

2. **Builds multi-arch images** using Docker Buildx with QEMU emulation

3. **Publishes to GitHub Container Registry** (`ghcr.io`)

4. **Tags images** with:
   - `latest` (for main branch)
   - Version tags (for releases)
   - Branch names (for feature branches)

### Available Images

```bash
# Latest Linux multi-arch
ghcr.io/yourusername/filament-inventory-tracker:latest

# Specific version
ghcr.io/yourusername/filament-inventory-tracker:v1.0.0

# Platform-specific (automatically selected)
docker pull --platform linux/arm64 ghcr.io/yourusername/filament-inventory-tracker:latest
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### Data Storage

- **Development**: SQLite database in `./data/filament_inventory.db`
- **Docker**: Mounted volume at `/app/data`
- **Kubernetes**: Persistent volume claim

## API Endpoints

### Filaments
- `GET /api/filaments` - List all filaments
- `GET /api/filaments/search?q=query` - Search filaments
- `GET /api/filaments/:id` - Get single filament
- `POST /api/filaments` - Add new filament
- `PUT /api/filaments/:id` - Update filament
- `DELETE /api/filaments/:id` - Delete filament

### Custom Data
- `GET /api/custom-brands` - List custom brands
- `POST /api/custom-brands` - Add custom brand
- `DELETE /api/custom-brands/:name` - Delete custom brand
- `GET /api/custom-types` - List custom types
- `POST /api/custom-types` - Add custom type
- `DELETE /api/custom-types/:name` - Delete custom type
- `GET /api/custom-colors` - List custom colors
- `POST /api/custom-colors` - Add custom color
- `DELETE /api/custom-colors/:name` - Delete custom color

### Health Check
- `GET /health` - Health status for monitoring

## Development

### Project Structure
```
├── public/           # Frontend files
│   ├── index.html   # Main HTML
│   ├── app.js       # Frontend JavaScript
│   └── styles.css   # Styling
├── k8s/             # Kubernetes manifests
├── .github/         # GitHub workflows
├── server.js        # Backend server
├── Dockerfile       # Container image
└── package.json     # Dependencies
```

### Building Images Locally

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t filament-tracker:local \
  .
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

The GitHub workflow will automatically build and test your changes.

## License

MIT License - see LICENSE file for details.
