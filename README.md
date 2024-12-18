# SMPP Gateway with WebSocket Integration

This project provides a NestJS-based **SMPP Gateway** that connects to an SMPP server and forwards incoming SMS messages to **WebSocket** clients in real-time. The gateway supports authentication for WebSocket clients using an API key stored in the environment file.

---

## Features

- **SMPP Connectivity**: Supports SMPP transceiver mode to send and receive SMS.
- **WebSocket Integration**: Broadcasts incoming SMS to all connected WebSocket clients.
- **Secure Authentication**: Clients must provide an API key to establish a WebSocket connection.
- **Reconnection Handling**: Automatically reconnects to the SMPP server if the connection is lost.

---

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up the environment variables by creating a `.env` file:

   ```env
   API_KEY=your_websocket_api_key

   SMPP_HOST=192.168.1.60
   SMPP_PORT=2775
   SMPP_USER={username}
   SMPP_PASS={password}
   ```

4. Run the application:
   ```bash
   npm run start
   ```

---

## Usage

### SMPP Gateway

The SMPP Gateway connects to an SMPP server and listens for incoming SMS. When a message is received, it broadcasts the SMS details to all authenticated WebSocket clients.

### WebSocket Integration

Clients connect to the WebSocket server by providing the API key as a query parameter. Incoming messages are forwarded to clients in real-time.

#### WebSocket URL

```
ws://<your-server-address>:<port>?apiKey=your_api_key
```

#### Example: Connect Using JavaScript

```javascript
const socket = io('http://localhost:3000', {
  query: {
    apiKey: 'your_api_key',
  },
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('sms', (data) => {
  console.log('Received SMS:', data);
});
```

### Sending Messages to Clients

Incoming SMS messages from the SMPP server are broadcasted to WebSocket clients as:

```json
{
  "source": "<source-address>",
  "destination": "<destination-address>",
  "message": "<message-content>",
  "timestamp": "<timestamp>"
}
```

---

## Example: Using with GOIP Device

1. **GOIP Configuration**

   - Log in to the GOIP device's admin panel.
   - Navigate to the **SMS Settings** or **SMPP Configuration** section.
   - Configure the following parameters:
     - **SMPP Server Address**: IP of the server running the SMPP Gateway.
     - **SMPP Port**: Port of the SMPP Gateway (default: 2775).
     - **System ID**: `username` (as configured in `.env`).
     - **Password**: `password` (as configured in `.env`).

2. **Send SMS Using GOIP**

   - Send an SMS through the GOIP device. The SMS will be forwarded to the SMPP Gateway and broadcasted to WebSocket clients.

3. **Receive SMS on WebSocket Client**
   - Connect a WebSocket client to the server.
   - Use the example JavaScript client provided above to receive SMS messages in real-time.

---

## Code Structure

### `SMPPGateway`

Handles SMPP server connection and processes incoming SMS messages.

### `WebSocketService`

Manages WebSocket connections and broadcasts messages to connected clients.

---

## License

This project is licensed under the [MIT License](LICENSE).
