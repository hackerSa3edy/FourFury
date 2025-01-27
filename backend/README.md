# 🎮 FourFury Backend Service

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10+-green.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-ff69b4.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

> A powerful, real-time backend service for the FourFury game, built with FastAPI and Socket.IO 🚀

## 🎯 Project Overview

- **Project Name**: FourFury Backend Service
- **Description**: Backend service for the FourFury game application
- **Key Features**:
  - FastAPI-based REST API
  - Real-time communication using Socket.IO
  - MongoDB database integration
  - Redis caching
- **Current Version**: 0.1.0

## 🛠 Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Core Language |
| FastAPI | 0.115.6 | Web Framework |
| MongoDB | Latest | Database |
| Redis | 5.2.1 | Caching & Real-time |
| Socket.IO | 5.12.1 | WebSocket Communication |

- **Key Dependencies**:
  - uvicorn[standard] - ASGI server
  - pydantic-settings - Settings management
  - motor-types - MongoDB type hints

## 📝 Prerequisites

> 🔍 Make sure you have these installed before proceeding

- Python 3.10 or higher
- MongoDB
- Redis
- Poetry package manager

## ⚡ Quick Start

1. Clone the repository

    ```bash
    git clone https://github.com/hackerSa3edy/FourFury/
    cd FourFury/backend
    ```

2. Install dependencies using Poetry

    ```bash
    poetry install
    ```

3. Set up environment variables (create a .env file)

    ```bash
    cp .env.example .env
    # Edit .env with your configuration
    ```

4. Start the development server

    ```bash
    poetry run uvicorn src.fourfury.run:app --reload
    ```

## 📁 Project Structure

```plaintext
FourFury Backend
├── Dockerfile
├── Makefile
├── README.md
├── docs/
│   └── openapi.json
├── poetry.lock
├── poetry.toml
├── pyproject.toml
├── src
│   └── fourfury
│       ├── __init__.py
│       ├── ai
│       │   ├── __init__.py
│       │   └── engine.py
│       ├── api
│       │   ├── __init__.py
│       │   ├── crud.py
│       │   ├── exceptions.py
│       │   ├── fields.py
│       │   ├── matchmaking.py
│       │   ├── models.py
│       │   ├── serializers.py
│       │   ├── socketio_manager.py
│       │   ├── utils.py
│       │   └── views.py
│       ├── cache.py
│       ├── constants.py
│       ├── core.py
│       ├── db
│       │   ├── __init__.py
│       │   ├── client.py
│       │   └── utils.py
│       ├── run.py
│       ├── session.py
│       └── settings.py
└── tests
    ├── __init__.py
    └── test_core.py

11 directories, 55 files
```

## ⚙️ Configuration

The project uses pydantic-settings for configuration management. Required environment variables:

```env
# Example .env file
DATABASE_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
```

## 🔄 Redis Usage

> 💡 Redis powers our real-time features and caching system

### Sessions Management

- **Purpose**: Maintains user authentication state across requests
- **Implementation**: Maps session IDs to usernames bidirectionally
- **Benefits**: Fast session lookups and validations
- **Lifecycle**: Sessions automatically expire after 24 hours for security

### Game State Caching

- **Purpose**: Optimizes game data access performance
- **Implementation**: Caches individual games and game lists separately
- **Benefits**: Reduces MongoDB load and improves response times
- **Invalidation**: Cache updates on game state changes

### Player Presence

- **Purpose**: Real-time player connection tracking
- **Implementation**: Tracks online/offline status and manages disconnect timers
- **Benefits**: Enables automatic forfeits and accurate game state
- **Features**:
  - Real-time status updates
  - 35-second disconnection grace period
  - Automatic forfeit on timeout

### Matchmaking Queue

- **Purpose**: Coordinates player matchmaking
- **Implementation**: Maintains waiting queue and player states
- **Benefits**: Efficient player pairing and game creation
- **Features**:
  - Queue management
  - Status tracking
  - Temporary game assignments

### Key Events System

- **Purpose**: Event-driven game state management
- **Implementation**: Uses Redis Pub/Sub for event notifications
- **Key Features**:
  - Disconnect detection
  - Automatic forfeit handling
  - Matchmaking cleanup
  - Real-time state synchronization

### Data Operations

- **Lists**: Used for ordered data like matchmaking queues
- **Sets**: Manages unique collections like active players
- **Key-Value**: Stores session and game state data
- **Pub/Sub**: Powers the real-time event system

### Redis Keys Reference

#### Session Keys

- `session:{session_id}` - Maps session ID to username
- `username:{username}` - Maps username to session ID
- **Functions**:
  - `create_session()` - Creates new session mapping
  - `validate_session()` - Validates session credentials
  - `refresh_session()` - Extends session expiry
  - `delete_session()` - Removes session mappings

#### Game Cache Keys

- `game:{game_id}` - Stores serialized game state
- `games` - List of all active games
- **Functions**:
  - `get_game_by_id()` - Retrieves cached game
  - `update_game()` - Updates game and invalidates cache
  - `invalidate_cache()` - Clears cached game data

#### Presence Keys

- `game:presence:{game_id}:{username}` - Player online status
- `game:countdown:{game_id}:{username}` - Disconnection timer
- **Functions**:
  - `set_player_status()` - Updates player presence
  - `start_countdown()` - Initiates disconnect timer
  - `stop_countdown()` - Cancels disconnect timer
  - `get_countdown_ttl()` - Gets remaining timeout

#### Matchmaking Keys

- `matchmaking:queue` - List of players seeking matches
- `matchmaking:status:{username}` - Player matchmaking state
- `matchmaking:game:{username}` - Temporary game assignment
- **Functions**:
  - `add_to_queue()` - Adds player to matchmaking
  - `get_waiting_player()` - Finds available opponent
  - `cancel_matching()` - Removes from queue
  - `create_rematch()` - Sets up game rematch

### Key Event Patterns

- **Expiration Events**: `__keyevent@*__:expired`
  - Monitored for player timeout detection
  - Triggers automatic game forfeits
  - Cleans up stale matchmaking entries

### Cache Decorator Usage

```python
@redis_cache(prefix="game", expire=3600)
async def get_game_by_id(game_id: str) -> Game:
    # Fetches from cache first, then database
```

## 🌐 API Documentation

> 📚 Explore our comprehensive API documentation

- Full API documentation available at:
  - Swagger UI: `/docs` - Interactive API documentation
  - OpenAPI JSON: `/docs/openapi.json` - Raw OpenAPI specification
- View the complete Postman workspace [here](https://www.postman.com/real3bdelrahman/workspace/fourfury/collection/33374896-ccbc6299-2b7f-423e-a198-07cb05194bd6?action=share&creator=33374896&active-environment=33374896-34f4d18c-d01f-4f08-ad82-a8947eb264f2).

- Run In Postman:
    [![Run In Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/33374896-ccbc6299-2b7f-423e-a198-07cb05194bd6?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D33374896-ccbc6299-2b7f-423e-a198-07cb05194bd6%26entityType%3Dcollection%26workspaceId%3D34726b82-678d-4c62-886e-74ffaaed1531#?env%5Blocal%5D=W3sia2V5IjoiYmFzZVVybCIsInZhbHVlIjoiaHR0cDovL2xvY2FsaG9zdDo4MDAwIiwiZW5hYmxlZCI6dHJ1ZSwidHlwZSI6ImRlZmF1bHQiLCJzZXNzaW9uVmFsdWUiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAiLCJjb21wbGV0ZVNlc3Npb25WYWx1ZSI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMCIsInNlc3Npb25JbmRleCI6MH1d)

### REST API Endpoints

All endpoints are documented in detail via OpenAPI specification. Key endpoints include:

#### Session Management

- `POST /api/games/create_session/` - Create/validate session

#### Game Management

- `POST /api/games/start/` - Start new game
- `GET /api/games/` - List all games
- `GET /api/games/{game_id}/` - Get specific game
- `POST /api/games/{game_id}/join/` - Join existing game
- `DELETE /api/games/` - Delete all games

### OpenAPI Schema

The complete OpenAPI specification is available in the [/docs](./docs/openapi.json) folder. The API supports:

- Session-based authentication
- Game mode selection (Human/AI/Online)
- Game state management
- Player matchmaking
- Move validation
- Game completion detection

## Socket.IO Events

### 📤 Client-to-Server Events

#### Connection Events - Client-to-Server

| Event | Description |
|-------|-------------|
| `connect` | Authenticates client using session cookies |
| `disconnect` | Handles cleanup of player resources and game state |

#### Game Room Events - Client-to-Server

| Event | Description | Payload |
|-------|-------------|---------|
| `join_game_room` | Join a specific game room | `{ game_id: string, player_status: "online"\|"offline" }` |
| `leave_game` | Leave a game room | `{ game_id: string }` |

#### Game Actions - Client-to-Server

| Event | Description | Payload |
|-------|-------------|---------|
| `move` | Make a move | `{ game_id: string, column: number }` |
| `forfeit` | Forfeit game | `{ game_id: string }` |

#### Matchmaking Events - Client-to-Server

| Event | Description | Payload |
|-------|-------------|---------|
| `start_matching` | Start matchmaking | `{ player_username: string, player_name: string, session_id: string }` |
| `cancel_matching` | Cancel matchmaking | - |

#### Rematch Events - Client-to-Server

| Event | Description | Payload |
|-------|-------------|---------|
| `request_rematch` | Request rematch | - |
| `accept_rematch` | Accept rematch | - |
| `decline_rematch` | Decline rematch | - |
| `cancel_rematch` | Cancel rematch | - |

#### Presence Events - Client-to-Server

| Event | Description | Payload |
|-------|-------------|---------|
| `presence_update` | Update status | `{ game_id: string, status: "online"\|"offline" }` |

### 📥 Server-to-Client Events

#### Game State Events

| Event | Description | Payload |
|-------|-------------|---------|
| `game_update` | Game state change | `{ id: string, board: array, current_player: string, winner: string\|null, finished_at: string\|null, player_1: string, player_2: string, mode: "PVP"\|"AI" }` |

#### Matchmaking Events - Server-to-Client

| Event | Description | Payload |
|-------|-------------|---------|
| `match_found` | Match found | `{ game: object, message: string }` |
| `matching_status` | Progress update | `{ game: object, status: string, message: string }` |
| `matching_error` | Error occurred | `{ message: string }` |
| `matching_cancelled` | Cancelled | `{ message: string }` |

#### Rematch Events - Server-to-Client

| Event | Description | Payload |
|-------|-------------|---------|
| `rematch_requested` | New request | `{ requestedBy: string, requesterName: string }` |
| `rematch_error` | Error occurred | `{ message: string }` |
| `rematch_declined` | Request declined | - |
| `rematch_cancelled` | Request cancelled | - |
| `rematch_started` | Rematch confirmed | `{ game_id: string }` |

#### Presence Events - Server-to-Client

| Event | Description | Payload |
|-------|-------------|---------|
| `countdown_update` | Status change | `{ username: string, countdown: number\|null, status: "online"\|"offline" }` |
| `forfeit_game` | Game forfeited | `{ username: string, message: string }` |

## 🗄️ Database

- Uses MongoDB with motor as the async driver
- Includes type hints through motor-types

## 🧪 Testing

> 🔍 Ensure quality with our test suite

Run tests using pytest:

```bash
poetry run pytest
```

## 🛠️ Development Tools

### Quality Assurance Tools

- ✨ **ruff** - Lightning-fast Python linter
- 🔍 **mypy** - Static type checker
- 🔄 **pre-commit** - Git hooks manager

## 11. Code Quality Setup

1. Install pre-commit hooks:

    ```bash
    poetry run pre-commit install
    ```

2. Run type checking:

    ```bash
    poetry run mypy .
    ```

3. Run linting:

    ```bash
    poetry run ruff check .
    ```

## 🔒 Security

> 🛡️ Built with security in mind

- Uses the latest dependency versions
- Implements proper authentication and authorization (details to be added)
- Follows FastAPI security best practices

---

:------------------------------------------:

Built with ❤️ by the FourFury Team

:------------------------------------------:
