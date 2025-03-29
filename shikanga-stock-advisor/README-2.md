# Stock Portfolio Advisor - Spring Boot & LangChain4j Tutorial

This guide provides step-by-step instructions to build the "Stock Portfolio Advisor" application based on the video tutorial. The application is a conversational AI that provides stock advice, simulates trading, and retrieves portfolio information using Spring Boot, LangChain4j, and external APIs.

## Goal

Build a conversational AI application that acts as a stock advisor. It should:
*   Provide stock recommendations based on user queries.
*   Fetch real-time (or near real-time) stock prices and company information.
*   Allow users to simulate buying and selling stocks.
*   Persist stock orders in a database.
*   Retrieve and display current orders and net holdings.
*   Utilize Large Language Models (LLMs) for conversation and reasoning.
*   Leverage LangChain4j's "Tools" feature for LLM-driven function calls.

## Technologies Used

*   **Backend:** Java, Spring Boot 3.3.5 (or similar), Spring Web, Spring Data JDBC, Maven
*   **Database:** PostgreSQL
*   **Database Admin Tool:** pgAdmin
*   **Containerization:** Docker, Docker Compose
*   **LLM Integration:** LangChain4j, OpenAI API (or Ollama)
*   **External Data API:** Financial Modeling Prep (for stock quotes, company profiles, financials)
*   **Frontend (Demo):** Next.js, React, TypeScript, Tailwind CSS, Shadcn UI, Marked
*   **Development Tools:** IntelliJ IDEA (or other IDE), Docker Desktop, Postman

---

## Step-by-Step Guide

### Phase 1: Backend Setup (Spring Boot & Database)

1.  **Create Spring Boot Project (`start.spring.io`):**
    *   Project: `Maven`
    *   Language: `Java`
    *   Spring Boot Version: e.g., `3.3.5`
    *   Project Metadata:
        *   Group: `com.codewiz`
        *   Artifact: `stock-advisor`
        *   Package: `com.codewiz.stockadvisor`
    *   Packaging: `Jar`
    *   Java Version: e.g., `17`, `21`, `23`
    *   **Dependencies:**
        *   `Spring Web`
        *   `Spring Data JDBC`
        *   `PostgreSQL Driver`
        *   `Docker Compose Support`
        *   `Lombok`
    *   Generate, download, and open the project in your IDE.

2.  **Configure Docker Compose (`compose.yaml`):**
    *   Modify the `postgres` service:
        ```yaml
        services:
          postgres:
            image: 'postgres:latest'
            environment:
              # Use your desired credentials
              POSTGRES_DB: stock-advisor-db
              POSTGRES_PASSWORD: secret
              POSTGRES_USER: stock-advisor-user
            ports:
              - '5432:5432' # Map host port 5432 to container port 5432
            restart: unless-stopped
        ```
    *   Add the `pgadmin` service:
        ```yaml
          pgadmin:
            image: dpage/pgadmin4
            environment:
              # Use your desired credentials for pgAdmin access
              PGADMIN_DEFAULT_EMAIL: admin@example.com
              PGADMIN_DEFAULT_PASSWORD: admin
            ports:
              - '8081:80' # Map host port 8081 to container port 80
            depends_on:
              - postgres # Ensure postgres starts first
            restart: unless-stopped
        ```

3.  **Configure Application Properties (`src/main/resources/application.properties`):**
    ```properties
    spring.application.name=stock-advisor

    # Optional: Explicit DB config (Docker Compose Support might autoconfigure)
    # spring.datasource.url=jdbc:postgresql://localhost:5432/stock-advisor-db
    # spring.datasource.username=stock-advisor-user
    # spring.datasource.password=secret

    # Allow case-insensitive enum mapping for OrderType
    spring.jackson.mapper.accept-case-insensitive-enums=true

    # LLM & API Key Configuration (See Phase 3, Step 10)
    # --- Stock API Config ---
    stock.api.key=${STOCK_API_KEY} # Set ENV VAR for Financial Modeling Prep Key

    # --- LangChain4j OpenAI Config (Example) ---
    langchain4j.open-ai.chat-model.api-key=${SPRING_AI_OPENAI_API_KEY} # Set ENV VAR
    langchain4j.open-ai.chat-model.model-name=gpt-4o
    langchain4j.open-ai.chat-model.log-requests=true
    langchain4j.open-ai.chat-model.log-responses=true
    # OR
    # --- LangChain4j Ollama Config (Example) ---
    # langchain4j.ollama.chat-model.base-url=http://localhost:11434
    # langchain4j.ollama.chat-model.model-name=llama3.1:8b
    # langchain4j.ollama.chat-model.temperature=0.8
    # langchain4j.ollama.chat-model.timeout=PT60S
    # langchain4j.ollama.chat-model.log-requests=true
    # langchain4j.ollama.chat-model.log-responses=true

    # --- Logging Levels ---
    logging.level.dev.langchain4j=DEBUG
    logging.level.dev.ai4j.openai=DEBUG # Adjust package based on provider if needed
    logging.level.com.codewiz.stockadvisor=DEBUG # For application-specific logs
    ```
    *   **Remember to set the actual API keys as environment variables** (`SPRING_AI_OPENAI_API_KEY`, `STOCK_API_KEY`). Choose and uncomment the relevant LLM provider section.

4.  **Run & Verify Database Setup:**
    *   Run `StockAdvisorApplication.java`.
    *   Check console logs for Docker Compose startup messages.
    *   Verify containers (`postgres`, `pgadmin`) are running via Docker Desktop.
    *   Access pgAdmin (e.g., `http://localhost:8081`), log in, and connect to your `stock-advisor-db`.

### Phase 2: Core Application Logic (Entities, Repo, Service)

5.  **Define Database Schema (`src/main/resources/schema.sql`):**
    *   Create this file if it doesn't exist.
    *   Add the SQL `CREATE TABLE` statement:
        ```sql
        CREATE TABLE IF NOT EXISTS stock_orders (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            symbol VARCHAR(10) NOT NULL,
            quantity INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            order_type VARCHAR(4) NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
            created_at TIMESTAMP NOT NULL
        );
        ```

6.  **Create Data Models (`src/main/java/com/codewiz/stockadvisor/model`):**
    *   Create the `model` package.
    *   `OrderType.java`:
        ```java
        package com.codewiz.stockadvisor.model;
        public enum OrderType { BUY, SELL }
        ```
    *   `StockOrder.java`:
        ```java
        package com.codewiz.stockadvisor.model;

        import org.springframework.data.annotation.Id;
        import org.springframework.data.relational.core.mapping.Column;
        import org.springframework.data.relational.core.mapping.Table;
        import java.math.BigDecimal;
        import java.time.LocalDateTime;

        @Table("stock_orders")
        public record StockOrder(
                @Id Long id,
                @Column("user_id") String userId,
                String symbol,
                Integer quantity,
                BigDecimal price,
                @Column("order_type") OrderType orderType,
                @Column("created_at") LocalDateTime createdAt
        ) {}
        ```
    *   `StockHoldingDetails.java`:
        ```java
        package com.codewiz.stockadvisor.model;

        public record StockHoldingDetails(String stockSymbol, Integer quantity) {}
        ```

7.  **Create Repository (`src/main/java/com/codewiz/stockadvisor/repository`):**
    *   Create the `repository` package.
    *   `StockOrderRepository.java`:
        ```java
        package com.codewiz.stockadvisor.repository;

        import com.codewiz.stockadvisor.model.StockOrder;
        import org.springframework.data.repository.ListCrudRepository;
        import java.util.List;

        public interface StockOrderRepository extends ListCrudRepository<StockOrder, Long> {
            List<StockOrder> findBySymbol(String symbol);
            // Add findAllByUserId if implementing user-specific data later
        }
        ```

8.  **Create Service (`src/main/java/com/codewiz/stockadvisor/service`):**
    *   Create the `service` package.
    *   `StockOrderService.java`:
        ```java
        package com.codewiz.stockadvisor.service;

        import com.codewiz.stockadvisor.model.OrderType;
        import com.codewiz.stockadvisor.model.StockHoldingDetails;
        import com.codewiz.stockadvisor.model.StockOrder;
        import com.codewiz.stockadvisor.repository.StockOrderRepository;
        import dev.langchain4j.agent.tool.Tool;
        import lombok.AllArgsConstructor;
        import org.springframework.stereotype.Service;

        import java.time.LocalDateTime;
        import java.util.List;
        import java.util.Map;
        import java.util.stream.Collectors;

        @Service
        @AllArgsConstructor
        public class StockOrderService {

            private final StockOrderRepository stockOrderRepository;

            @Tool("Use this tool to create a stock order (BUY or SELL). User ID is assumed to be 'testuser'.")
            public StockOrder createOrder(StockOrder order) {
                // In a real app, get user ID from security context
                String currentUserId = "testuser";
                StockOrder newOrder = new StockOrder(
                        null,
                        currentUserId,
                        order.symbol(),
                        order.quantity(),
                        order.price(),
                        order.orderType(),
                        LocalDateTime.now()
                );
                return stockOrderRepository.save(newOrder);
            }

            @Tool("Use this tool to get all previously placed stock orders for the current user ('testuser').")
            public List<StockOrder> getAllOrders() {
                // In a real app, filter by user ID from security context
                return stockOrderRepository.findAll(); // Simplified for demo
            }

            // Not exposed as tool, used internally or for specific direct calls
            public StockOrder getOrderById(Long id) {
                return stockOrderRepository.findById(id).orElse(null);
            }

             // Not exposed as tool, used internally or for specific direct calls
            public List<StockOrder> getOrdersBySymbol(String symbol) {
                return stockOrderRepository.findBySymbol(symbol);
            }

            @Tool("Use this tool to get the summary of current net stock holdings (final quantity per stock symbol) for the current user ('testuser').")
            public List<StockHoldingDetails> getStockHoldingDetails() {
                // In a real app, filter by user ID first
                List<StockOrder> allOrders = stockOrderRepository.findAll(); // Simplified for demo
                return allOrders.stream()
                        .collect(Collectors.groupingBy(StockOrder::symbol,
                                Collectors.summingInt(order ->
                                        order.orderType() == OrderType.BUY ? order.quantity() : -order.quantity())))
                        .entrySet().stream()
                        // Filter out stocks with zero or negative net quantity
                        .filter(entry -> entry.getValue() > 0)
                        .map(entry -> new StockHoldingDetails(entry.getKey(), entry.getValue()))
                        .collect(Collectors.toList());
            }
        }
        ```

### Phase 3: LLM and External API Integration (LangChain4j & Tools)

9.  **Add LangChain4j Dependencies (`pom.xml`):**
    *   (Already done in Step 1) Ensure `langchain4j-spring-boot-starter` and the relevant LLM provider starter (`langchain4j-open-ai-spring-boot-starter` or `langchain4j-ollama-spring-boot-starter`) are present.

10. **Configure LLM and API Keys (`src/main/resources/application.properties`):**
    *   (Already done in Step 3) Make sure LLM settings and the `stock.api.key` are configured.

11. **Create External Stock API Service (`src/main/java/com/codewiz/stockadvisor/config` and `service`):**
    *   `config/StockAPIConfig.java`: (As defined in Step 8 above)
    *   `service/StockInformationService.java`: (As defined in Step 8 above, including `@Tool` and `@P` annotations)

12. **Create AI Assistant Interface (`src/main/java/com/codewiz/stockadvisor/assistant`):**
    *   Create the `assistant` package.
    *   `StockAdvisorAssistant.java`:
        ```java
        package com.codewiz.stockadvisor.assistant;

        import dev.langchain4j.service.MemoryId; // For potential future multi-user support
        import dev.langchain4j.service.SystemMessage;
        import dev.langchain4j.service.spring.AiService;

        @AiService
        public interface StockAdvisorAssistant {

            // The SystemMessage provides instructions and context to the LLM
            @SystemMessage("""
                    You are a polite stock advisor assistant named 'Stock Advisor'.
                    You provide advice based on the latest stock price, company information, and financial results available to you through tools.
                    When you are asked to create a stock order (BUY or SELL), ALWAYS ask the user for confirmation before creating it.
                    To ask for confirmation, FIRST retrieve the current market price for the stock using the getStockPrice tool.
                    Then, present the user with the details: Stock Symbol, Order Type (BUY/SELL), Quantity, Order Price (specified by user), and the Current Market Price you retrieved.
                    Ask clearly: "Would you like to proceed with creating this {{orderType}} order?"
                    Only if the user explicitly confirms (e.g., says "yes", "confirm", "proceed"), then use the createOrder tool.
                    If the user cancels or says no, acknowledge the cancellation and do not create the order.
                    All your responses should be in clear markdown format.
                    When returning a list of items (like positions, orders, list of stocks etc), please format them as a markdown table.
                    """)
            // Use @MemoryId later if supporting multiple users with distinct memories
            String chat(@MemoryId String chatId, String userMessage);

            // Overload without MemoryId for single-user demo simplicity
            String chat(String userMessage);
        }
        ```
        *Note: Added `@MemoryId` for future reference, but using the simpler overload for the demo.*

13. **Configure AI Assistant Bean and Memory (`src/main/java/com/codewiz/stockadvisor/config`):**
    *   Create `AssistantConfiguration.java`:
        ```java
        package com.codewiz.stockadvisor.config;

        import com.codewiz.stockadvisor.assistant.StockAdvisorAssistant;
        import com.codewiz.stockadvisor.service.StockInformationService;
        import com.codewiz.stockadvisor.service.StockOrderService;
        import dev.langchain4j.memory.ChatMemory;
        import dev.langchain4j.memory.chat.MessageWindowChatMemory;
        import dev.langchain4j.model.chat.ChatLanguageModel;
        import dev.langchain4j.service.AiServices;
        import org.springframework.context.annotation.Bean;
        import org.springframework.context.annotation.Configuration;

        @Configuration
        public class AssistantConfiguration {

            // Configure chat memory (in-memory window, retains last 20 messages)
            @Bean
            public ChatMemory chatMemory() {
                return MessageWindowChatMemory.withMaxMessages(20);
            }

            // Configure the AI Service (Assistant) wiring it with the LLM, memory, and tools
            @Bean
            public StockAdvisorAssistant stockAdvisorAssistant(ChatLanguageModel chatLanguageModel,
                                                               ChatMemory chatMemory,
                                                               StockOrderService stockOrderService,
                                                               StockInformationService stockInformationService) {
                return AiServices.builder(StockAdvisorAssistant.class)
                        .chatLanguageModel(chatLanguageModel)
                        .chatMemory(chatMemory)
                        .tools(stockOrderService, stockInformationService) // Make tools available to the LLM
                        .build();
            }
        }
        ```

14. **Create Controller (`src/main/java/com/codewiz/stockadvisor/StockAdvisorController.java`):**
    ```java
    package com.codewiz.stockadvisor;

    import com.codewiz.stockadvisor.assistant.StockAdvisorAssistant;
    import lombok.AllArgsConstructor;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.RequestParam;
    import org.springframework.web.bind.annotation.RestController;

    import java.time.Instant;

    @RestController
    @AllArgsConstructor
    public class StockAdvisorController {

        private final StockAdvisorAssistant assistant;

        @GetMapping("/chat")
        public String chat(@RequestParam(value = "message", defaultValue = "Hello") String userMessage) {
            // Simple chat endpoint, using a timestamp as a basic chat ID for memory
            // In a real app, use a proper user session ID
            String chatId = Instant.now().toString(); // Use timestamp as unique ID for demo
            // Use the simpler chat method for the demo
            return assistant.chat(userMessage);
            // To use memory per session: return assistant.chat(chatId, userMessage);
        }
    }
    ```

### Phase 4: Frontend (Setup & Test)

15. **Setup Frontend Project (Stock-Advisor-UI - Next.js Example):**
    *   Use `create-next-app` with TypeScript and Tailwind.
    *   Install dependencies: `npm install marked lucide-react class-variance-authority clsx tailwind-merge tailwindcss-animate @radix-ui/react-slot @radix-ui/react-dropdown-menu next-themes` and `@types/marked`.
    *   Set up Shadcn UI (optional, for components like Card, Input, Button, Theme Toggle): `npx shadcn-ui@latest init`, then add components: `npx shadcn-ui@latest add card input button dropdown-menu`.
    *   **`app/page.tsx` (Main Chat Interface):** Create a client component (`'use client'`) with state for input and messages. Implement the chat UI (input, button, message list rendering) and the `handleSendMessage` function to call the server action.
    *   **`app/actions.ts` (Server Action):** Create the `sendMessage` async function that fetches data from the Spring Boot backend's `/chat` endpoint, uses `marked` to parse the Markdown response, and returns HTML.
    *   **`app/layout.tsx` (Basic Layout):** Include Header (with app title and theme toggle), Footer (with copyright), and ThemeProvider.

16. **Final Testing:**
    *   Run the Spring Boot backend (`StockAdvisorApplication`).
    *   Run the Next.js frontend (`npm run dev`).
    *   Open the frontend URL (e.g., `http://localhost:3000`).
    *   Test interactions:
        *   Basic greetings: "Hello who are you?"
        *   Stock recommendation: "I have 10000 to invest. Recommend 3 stocks from tech, pharma, bank."
        *   Simulate Buying: "Buy 100 AAPL at 223" -> Confirm with "yes". Check DB.
        *   Simulate Selling: "Sell 50 AAPL at 225" -> Confirm with "yes". Check DB.
        *   Retrieve Orders: "show me my orders"
        *   Retrieve Holdings: "show me my current net holding"
        *   Holdings with Value: "show my current net holding along with current market value"
        *   Financial Comparison: "compare financial results of GOOGL and MSFT this year"
    *   Observe backend logs (especially with DEBUG enabled) to see LLM interactions and tool calls.

---

This README provides a comprehensive overview matching the steps covered in the video. Remember to replace placeholders (like API keys and potentially user IDs) with your actual values or implementation details.