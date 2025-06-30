# Filament Inventory Tracker - 3D Printing Inventory Management

A modern, mobile-friendly web application for tracking your 3D printing filament inventory. Built with Node.js, Express, SQLite, and vanilla JavaScript.

## Features

- **Comprehensive Filament Tracking**: Track brand, type, color, spool type (refill/with spool), weight remaining, purchase date, and notes
- **Modern UI**: Clean, intuitive interface with responsive design
- **Quick Search**: Search across all filament properties
- **Inventory Statistics**: View total filaments, brands, and remaining weight
- **Mobile Friendly**: Optimized for mobile devices and tablets
- **Persistent Storage**: SQLite database ensures data persistence
- **Kubernetes Ready**: Easy deployment as a pod in Kubernetes clusters

## Quick Start

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm start
   ```

3. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

### Development Mode

For development with auto-reload:
```bash
npm run dev
```

## Docker Deployment

### Build the Docker Image

```bash
docker build -t filament-inventory-tracker:latest .
```

### Run with Docker

```bash
docker run -d \
  --name filament-inventory-tracker \
  -p 3000:3000 \
  -v filament-data:/app/data \
  filament-inventory-tracker:latest
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster
- kubectl configured
- Docker image built and available in your registry

### Deploy to Kubernetes

1. **Create the Persistent Volume Claim**
   ```bash
   kubectl apply -f k8s/pvc.yaml
   ```

2. **Deploy the Application**
   ```bash
   kubectl apply -f k8s/deployment.yaml
   ```

3. **Create the Service**
   ```bash
   kubectl apply -f k8s/service.yaml
   ```

4. **Verify Deployment**
   ```bash
   kubectl get pods -l app=filament-inventory-tracker
   kubectl get svc filament-inventory-tracker-service
   ```

### Access the Application in Kubernetes

#### Port Forward (for testing)
```bash
kubectl port-forward svc/filament-inventory-tracker-service 3000:80
```
Then access at `http://localhost:3000`

#### Ingress (for production)
Create an ingress resource to expose the service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: filament-inventory-tracker-ingress
spec:
  rules:
  - host: filament-inventory-tracker.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: filament-inventory-tracker-service
            port:
              number: 80
```

## API Endpoints

The application provides a REST API for programmatic access:

- `GET /api/filaments` - Get all filaments
- `GET /api/filaments/search?q=query` - Search filaments
- `GET /api/filaments/:id` - Get specific filament
- `POST /api/filaments` - Add new filament
- `PUT /api/filaments/:id` - Update filament
- `DELETE /api/filaments/:id` - Delete filament
- `GET /health` - Health check endpoint

## Data Schema

Each filament record contains:

```json
{
  "id": 1,
  "brand": "Hatchbox",
  "type": "PLA",
  "color": "Red",
  "spool_type": "with_spool",
  "weight_remaining": 850,
  "purchase_date": "2024-01-15",
  "notes": "Great quality, prints well at 200°C",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### Database

The application uses SQLite for data storage. The database file is created automatically at `./filament_inventory.db` (or `/app/data/filament_inventory.db` in Docker).

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search input
- `Ctrl/Cmd + N` - Add new filament
- `Escape` - Close modals

## Browser Support

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Mobile Support

The application is fully responsive and optimized for:
- iOS Safari
- Android Chrome
- Mobile browsers with viewport support

## Production Considerations

### Security
- The application runs as a non-root user in Docker
- Input validation and sanitization
- CORS protection

### Performance
- Efficient SQLite queries with indexes
- Lightweight frontend with minimal dependencies
- Gzip compression for static assets

### Monitoring
- Health check endpoint at `/health`
- Kubernetes liveness and readiness probes
- Application logs for debugging

## Troubleshooting

### Common Issues

1. **Database Permission Errors**
   - Ensure the data directory is writable
   - Check file permissions in Docker/Kubernetes

2. **Port Already in Use**
   - Change the PORT environment variable
   - Kill existing processes using the port

3. **Kubernetes Pod Not Starting**
   - Check pod logs: `kubectl logs -l app=filament-inventory-tracker`
   - Verify PVC is bound: `kubectl get pvc`

### Logs

View application logs:
```bash
# Docker
docker logs filament-inventory-tracker

# Kubernetes
kubectl logs -l app=filament-inventory-tracker -f
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review application logs
- Create an issue in the repository
