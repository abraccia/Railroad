class RailRoadC2 {
    constructor() {
        this.socket = io();
        this.currentClient = 'broadcast';
        this.commandHistory = [];
        this.clients = {};
        
        this.initializeEventListeners();
        this.setupSocketEvents();
        this.loadInitialData();
        this.startStatusChecker();
    }

    initializeEventListeners() {
        // Command form submission
        document.getElementById('commandForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendCommand();
        });

        // Client selection
        document.getElementById('clientSelect').addEventListener('change', (e) => {
            this.currentClient = e.target.value;
        });

        // Refresh clients button
        document.getElementById('refreshClients').addEventListener('click', () => {
            this.loadClients();
        });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            this.showNotification('Connected to RailRoad C2 Server', 'success');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            this.showNotification('Disconnected from server', 'error');
        });

        this.socket.on('clients_update', (clients) => {
            this.clients = clients;
            this.updateClientList(clients);
        });

        this.socket.on('client_connected', (data) => {
            this.showNotification(`Client connected: ${data.client_id}`, 'success');
            this.loadClients(); // Refresh client list
        });

        this.socket.on('client_disconnected', (data) => {
            this.showNotification(`Client disconnected: ${data.client_id}`, 'warning');
            this.loadClients(); // Refresh client list
        });

        this.socket.on('command_sent', (data) => {
            this.addToCommandHistory({
                id: Date.now(),
                client_id: data.client_id,
                command: data.command,
                timestamp: data.timestamp,
                type: 'single'
            });
        });

        this.socket.on('status', (data) => {
            this.showNotification(data.message, 'info');
        });
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (connected) {
            statusElement.className = 'badge bg-success';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
        } else {
            statusElement.className = 'badge bg-danger';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        }
    }

    updateClientList(clients) {
        const clientList = document.getElementById('clientList');
        const clientSelect = document.getElementById('clientSelect');
        
        // Clear existing options except "Broadcast to All"
        clientList.innerHTML = '';
        while (clientSelect.children.length > 1) {
            clientSelect.removeChild(clientSelect.lastChild);
        }

        // Update total clients count
        const totalClients = Object.keys(clients).length;
        document.getElementById('totalClients').textContent = totalClients;

        // Add clients to list and dropdown
        Object.entries(clients).forEach(([clientId, clientInfo]) => {
            const connectionTime = new Date(clientInfo.connected_at).toLocaleString();
            const lastSeen = new Date(clientInfo.last_seen).toLocaleString();
            
            // Add to sidebar list
            const clientElement = document.createElement('div');
            clientElement.className = `list-group-item client-item ${clientInfo.active ? 'status-connected' : 'status-disconnected'}`;
            clientElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="fas fa-desktop me-2"></i>
                                <strong class="small">${clientId}</strong>
                            </div>
                            <span class="badge ${clientInfo.active ? 'bg-success' : 'bg-danger'}">
                                ${clientInfo.active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div class="small text-muted mt-1">
                            <div>Connected: ${connectionTime}</div>
                            <div>Last seen: ${lastSeen}</div>
                        </div>
                    </div>
                </div>
            `;
            clientList.appendChild(clientElement);

            // Add to dropdown
            const option = document.createElement('option');
            option.value = clientId;
            option.textContent = `${clientId} ${clientInfo.active ? '🟢' : '🔴'}`;
            clientSelect.appendChild(option);
        });

        // Update active commands count
        this.updateActiveCommandsCount();
    }

    async loadClients() {
        try {
            const response = await fetch('/api/clients');
            const clients = await response.json();
            this.clients = clients;
            this.updateClientList(clients);
        } catch (error) {
            console.error('Failed to load clients:', error);
            this.showNotification('Failed to load clients', 'error');
        }
    }

    async sendCommand() {
        const commandInput = document.getElementById('commandInput');
        const command = commandInput.value.trim();

        if (!command) {
            this.showNotification('Please enter a command', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: this.currentClient,
                    command: command
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(result.message, 'success');
                commandInput.value = '';
                
                // Add to command history
                this.addToCommandHistory({
                    id: Date.now(),
                    client_id: this.currentClient,
                    command: command,
                    timestamp: new Date().toISOString(),
                    type: this.currentClient === 'broadcast' ? 'broadcast' : 'single'
                });
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to send command: ' + error.message, 'error');
        }
    }

    addToCommandHistory(command) {
        this.commandHistory.unshift(command);
        this.renderCommandHistory();
        this.updateActiveCommandsCount();
    }

    renderCommandHistory() {
        const historyContainer = document.getElementById('commandHistory');
        historyContainer.innerHTML = '';

        this.commandHistory.slice(0, 10).forEach(cmd => {
            const commandElement = document.createElement('div');
            commandElement.className = `command-item ${cmd.type === 'broadcast' ? 'broadcast-command' : ''}`;
            commandElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong class="small">${cmd.client_id}</strong>
                                <code class="ms-2">${cmd.command}</code>
                            </div>
                            <small class="text-muted">${new Date(cmd.timestamp).toLocaleTimeString()}</small>
                        </div>
                        <div class="small text-muted">${cmd.type.toUpperCase()} command</div>
                    </div>
                </div>
            `;
            historyContainer.appendChild(commandElement);
        });
    }

    updateActiveCommandsCount() {
        const activeCommands = this.commandHistory.filter(cmd => 
            Date.now() - new Date(cmd.timestamp).getTime() < 30000
        ).length;
        document.getElementById('activeCommands').textContent = activeCommands;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Add to page
        const container = document.querySelector('.main-content');
        container.insertBefore(notification, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    async loadInitialData() {
        try {
            // Load command history
            const historyResponse = await fetch('/api/history');
            this.commandHistory = await historyResponse.json();
            this.renderCommandHistory();

            // Load clients
            await this.loadClients();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Failed to load initial data', 'error');
        }
    }

    startStatusChecker() {
        // Check server status every 10 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/server/status');
                const status = await response.json();
                
                if (status.status === 'running') {
                    this.updateConnectionStatus(true);
                } else {
                    this.updateConnectionStatus(false);
                }
            } catch (error) {
                this.updateConnectionStatus(false);
            }
        }, 10000);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new RailRoadC2();
});