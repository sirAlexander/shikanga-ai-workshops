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
    # ... add langchain4j and stock API properties here later ...
    ```

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
        import dev.langchain4j.agent.tool.Tool; // Import Tool annotation
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

            @Tool("Creates a stock order (BUY or SELL)") // Description for the LLM
            public StockOrder createOrder(StockOrder order) {
                StockOrder newOrder = new StockOrder(
                        null, // ID is auto-generated
                        "testuser", // Hardcoded user for simplicity
                        order.symbol(),
                        order.quantity(),
                        order.price(),
                        order.orderType(),
                        LocalDateTime.now()
                );
                return stockOrderRepository.save(newOrder);
            }

            @Tool("Gets all previously placed stock orders") // Description for the LLM
            public List<StockOrder> getAllOrders() {
                return stockOrderRepository.findAll();
            }

            // Not exposed as a tool, internal helper or specific retrieval
            public StockOrder getOrderById(Long id) {
                return stockOrderRepository.findById(id).orElse(null);
            }

            // Not exposed as a tool, internal helper or specific retrieval
            public List<StockOrder> getOrdersBySymbol(String symbol) {
                return stockOrderRepository.findBySymbol(symbol);
            }

            @Tool("Gets the summary of current net stock holdings (quantity per stock symbol)") // Description for the LLM
            public List<StockHoldingDetails> getStockHoldingDetails() {
                return stockOrderRepository.findAll().stream()
                        .collect(Collectors.groupingBy(StockOrder::symbol,
                                Collectors.summingInt(order ->
                                        order.orderType() == OrderType.BUY ? order.quantity() : -order.quantity())))
                        .entrySet().stream()
                        .map(entry -> new StockHoldingDetails(entry.getKey(), entry.getValue()))
                        .collect(Collectors.toList());
            }
        }
        ```

### Phase 3: LLM and External API Integration (LangChain4j & Tools)

9.  **Add LangChain4j Dependencies (`pom.xml`):**
    *   Add the core LangChain4j Spring Boot starter:
        ```xml
        <dependency>
            <groupId>dev.langchain4j</groupId>
            <artifactId>langchain4j-spring-boot-starter</artifactId>
            <version>0.35.0</version> <!-- Check for the latest version -->
        </dependency>
        ```
    *   Add the specific LLM provider starter (e.g., for OpenAI):
        ```xml
        <dependency>
            <groupId>dev.langchain4j</groupId>
            <artifactId>langchain4j-open-ai-spring-boot-starter</artifactId>
            <version>0.35.0</version> <!-- Check for the latest version -->
        </dependency>
        ```
        *(Replace with `langchain4j-ollama-spring-boot-starter` if using Ollama)*
    *   Reload Maven dependencies (`mvn clean install` or IDE sync).

10. **Configure LLM and API Keys (`src/main/resources/application.properties`):**
    *   *Example for OpenAI:*
        ```properties
        # --- LangChain4j OpenAI Config ---
        langchain4j.open-ai.chat-model.api-key=${SPRING_AI_OPENAI_API_KEY} # Set ENV VAR
        langchain4j.open-ai.chat-model.model-name=gpt-4o
        langchain4j.open-ai.chat-model.log-requests=true
        langchain4j.open-ai.chat-model.log-responses=true
        logging.level.dev.langchain4j=DEBUG
        logging.level.dev.ai4j.openai=DEBUG
        ```
    *   *Example for Ollama:*
        ```properties
        # --- LangChain4j Ollama Config ---
        langchain4j.ollama.chat-model.base-url=http://localhost:11434
        langchain4j.ollama.chat-model.model-name=llama3.1:8b
        langchain4j.ollama.chat-model.temperature=0.8
        langchain4j.ollama.chat-model.timeout=PT60S
        langchain4j.ollama.chat-model.log-requests=true
        langchain4j.ollama.chat-model.log-responses=true
        logging.level.dev.langchain4j=DEBUG
        ```
    *   Add external stock API key property:
        ```properties
        # --- Stock API Config ---
        stock.api.key=${STOCK_API_KEY} # Set ENV VAR for Financial Modeling Prep Key
        ```
    *   **Remember to set the actual API keys as environment variables** (`SPRING_AI_OPENAI_API_KEY`, `STOCK_API_KEY`).

11. **Create External Stock API Service:**
    *   Create package `com.codewiz.stockadvisor.config`.
    *   `StockAPIConfig.java`:
        ```java
        package com.codewiz.stockadvisor.config;

        import org.springframework.beans.factory.annotation.Value;
        import org.springframework.context.annotation.Bean;
        import org.springframework.context.annotation.Configuration;
        import org.springframework.web.client.RestClient;

        @Configuration
        public class StockAPIConfig {

            // Inject the API key from application.properties
            @Value("${stock.api.key}")
            private String apiKey;

            @Bean
            public RestClient getRestClient() {
                return RestClient.builder()
                        .baseUrl("https://financialmodelingprep.com/api/v3")
                        .build();
            }

            // Getter for the API key to be used by the service
            public String getApiKey() {
                return apiKey;
            }
        }
        ```
    *   `StockInformationService.java` (`src/main/java/com/codewiz/stockadvisor/service`):
        ```java
        package com.codewiz.stockadvisor.service;

        import com.codewiz.stockadvisor.config.StockAPIConfig;
        import dev.langchain4j.agent.tool.P;
        import dev.langchain4j.agent.tool.Tool;
        import lombok.AllArgsConstructor;
        import lombok.extern.slf4j.Slf4j;
        import org.springframework.stereotype.Service;
        import org.springframework.web.client.RestClient;

        import java.util.ArrayList;
        import java.util.List;
        import java.util.Arrays;
        import java.util.stream.Collectors;


        @Service
        @AllArgsConstructor
        @Slf4j
        public class StockInformationService {

            private final StockAPIConfig stockAPIConfig;
            private final RestClient restClient;

            // Helper method to fetch data and append API key
            private String fetchData(String path) {
                log.info("Fetching data from FMP API path: {}", path);
                try {
                    String response = restClient.get()
                            .uri(path + "?apikey=" + stockAPIConfig.getApiKey())
                            .retrieve()
                            .body(String.class);
                    // Basic cleanup - remove excessive whitespace/newlines
                    return response != null ? response.replaceAll("\\s+", " ").trim() : "{}";
                } catch (Exception e) {
                    log.error("Error fetching data from path {}: {}", path, e.getMessage());
                    return "{\"error\": \"Failed to fetch data\"}";
                }
            }

             // Helper for APIs that don't support multiple symbols directly
            private List<String> fetchDataForMultipleSymbols(String stockSymbols, String pathSegment) {
                 log.info("Fetching {} for stock symbols: {}", pathSegment, stockSymbols);
                 List<String> data = new ArrayList<>();
                 String[] symbols = stockSymbols.split(",");
                 for (String symbol : symbols) {
                     String trimmedSymbol = symbol.trim();
                     if (!trimmedSymbol.isEmpty()) {
                         String response = fetchData(pathSegment + "/" + trimmedSymbol);
                         data.add(response);
                     }
                 }
                 return data;
             }


            @Tool("Returns the stock price(s) for the given stock symbol(s)")
            public String getStockPrice(@P("Stock symbols separated by comma, e.g., AAPL,MSFT") String stockSymbols) {
                log.info("Fetching stock price for stock symbols: {}", stockSymbols);
                // The /quote endpoint supports comma-separated symbols
                return fetchData("/quote/" + stockSymbols);
            }

            @Tool("Returns the company profile(s) for the given stock symbol(s)")
            public String getCompanyProfile(@P("Stock symbols separated by comma, e.g., AAPL,MSFT") String stockSymbols) {
                log.info("Fetching company profile for stock symbols: {}", stockSymbols);
                 // The /profile endpoint supports comma-separated symbols
                return fetchData("/profile/" + stockSymbols);
            }

            @Tool("Returns the balance sheet statements for the given stock symbol(s)")
            public List<String> getBalanceSheetStatements(@P("Stock symbols separated by comma, e.g., AAPL,MSFT") String stockSymbols) {
                 return fetchDataForMultipleSymbols(stockSymbols, "/balance-sheet-statement");
            }

             @Tool("Returns the income statements for the given stock symbol(s)")
            public List<String> getIncomeStatements(@P("Stock symbols separated by comma, e.g., AAPL,MSFT") String stockSymbols) {
                 return fetchDataForMultipleSymbols(stockSymbols, "/income-statement");
            }

            @Tool("Returns the cash flow statements for the given stock symbol(s)")
            public List<String> getCashFlowStatements(@P("Stock symbols separated by comma, e.g., AAPL,MSFT") String stockSymbols) {
                  return fetchDataForMultipleSymbols(stockSymbols, "/cash-flow-statement");
            }
        }
        ```

12. **Create AI Assistant Interface (`src/main/java/com/codewiz/stockadvisor/assistant`):**
    *   Create the `assistant` package.
    *   `StockAdvisorAssistant.java`:
        ```java
        package com.codewiz.stockadvisor.assistant;

        import dev.langchain4j.service.SystemMessage;
        import dev.langchain4j.service.spring.AiService;

        @AiService // LangChain4j annotation to create the assistant bean
        public interface StockAdvisorAssistant {

            @SystemMessage("""
                    You are a polite stock advisor assistant who provides advice based on
                    the latest stock price, company information and financial results.
                    When you are asked to create a stock order, ask for a confirmation before creating it.
                    In the confirmation message, include the stock symbol, quantity, and price and current market price.
                    All your responses should be in markdown format.
                    When you are returning a list of items like position, orders, list of stocks etc, return them in a table format.
                    """)
            String chat(String userMessage);
        }
        ```

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

            // Configure chat memory (in-memory window)
            @Bean
            public ChatMemory chatMemory() {
                // Keep the last 20 messages for context
                return MessageWindowChatMemory.withMaxMessages(20);
            }

            // Configure the AI Service (Assistant)
            @Bean
            public StockAdvisorAssistant stockAdvisorAssistant(ChatLanguageModel chatLanguageModel,
                                                               ChatMemory chatMemory,
                                                               StockOrderService stockOrderService, // Inject tool service
                                                               StockInformationService stockInformationService // Inject tool service
                                                              ) {
                return AiServices.builder(StockAdvisorAssistant.class)
                        .chatLanguageModel(chatLanguageModel) // LLM integration
                        .chatMemory(chatMemory) // Assign memory
                        .tools(stockOrderService, stockInformationService) // Provide the tool beans
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

    @RestController
    @AllArgsConstructor
    public class StockAdvisorController {

        // Inject the AI Assistant Bean
        private final StockAdvisorAssistant assistant;

        @GetMapping("/chat")
        public String chat(@RequestParam(value = "message", defaultValue = "Hello") String userMessage) {
            // Delegate the chat logic to the AI Assistant
            return assistant.chat(userMessage);
        }
    }
    ```

### Phase 4: Frontend (Setup & Test)

15. **Setup Frontend Project (Stock-Advisor-UI - Next.js Example):**
    *   Create a new Next.js project (e.g., using `create-next-app`).
    *   Install necessary dependencies: `npm install react react-dom next marked lucide-react class-variance-authority clsx tailwind-merge tailwindcss-animate @radix-ui/react-slot @radix-ui/react-dropdown-menu next-themes` (add types if using TypeScript: `@types/react @types/node @types/marked typescript`).
    *   Configure Tailwind CSS and Shadcn UI components (follow their respective setup guides).
    *   **`app/page.tsx` (Main Chat Interface):**
        *   Use `useState` hooks for managing `input` text and the `messages` array (array of objects like `{ user: string; html: string; time: string }`).
        *   Render an input field, bind its value to `input`, update `input` state `onChange`.
        *   Render a "Send" button, trigger `handleSendMessage` `onClick`.
        *   Implement `handleKeyDown` on the input to also trigger `handleSendMessage` if the "Enter" key is pressed.
        *   Implement `handleSendMessage` (async function):
            *   Add the user's message to the `messages` state (`{ user: 'You', html: input, time: ... }`).
            *   Call the `sendMessage` server action (defined below) with the user's input.
            *   Add the assistant's response (HTML from the server action) to the `messages` state (`{ user: 'Stock Advisor', html: responseHtml, time: ... }`).
            *   Clear the input field.
            *   Handle potential errors.
        *   Map through the `messages` state array and render each message, using `dangerouslySetInnerHTML={{ __html: message.html }}` to render the HTML returned from the backend (which includes Markdown formatting).
    *   **`app/actions.ts` (Server Action):**
        ```typescript
        'use server'; // Mark this file for server actions

        import { marked } from 'marked'; // Import Markdown parser

        export async function sendMessage(userMessage: string): Promise<string> {
            const encodedMessage = encodeURIComponent(userMessage);
            // Ensure this URL points to your running Spring Boot backend
            const url = `http://localhost:8080/chat?userMessage=${encodedMessage}`;

            try {
                const response = await fetch(url, { method: 'GET' }); // Adjust method if needed

                if (!response.ok) {
                    console.error("Network response was not ok: ", response.statusText);
                    throw new Error('Network response was not ok');
                }

                const markdownText = await response.text();
                // Parse Markdown to HTML on the server before sending to client
                const html = await marked.parse(markdownText);
                return html;

            } catch (error) {
                console.error("Error sending message to backend:", error);
                return "<p>Sorry, I encountered an error talking to the advisor service.</p>";
            }
        }
        ```
    *   **`app/layout.tsx` (Basic Layout):** Include a Header, Footer, and wrap the main content (`children`) with a ThemeProvider for styling (using Shadcn/NextThemes).

16. **Final Testing:**
    *   Start the Spring Boot backend (`StockAdvisorApplication`).
    *   Start the Next.js frontend (`npm run dev`).
    *   Open the frontend (e.g., `http://localhost:3000`).
    *   Interact with the chatbot using prompts similar to the video demo:
        *   "Hello who are you?"
        *   "I have 10000 to invest. Recommend 3 stocks of companies from different sectors like tech, pharma, bank etc"
        *   "Buy 150 Apple at 222, 100 Pfizer at 28 and 200 JPMorgan at 247" -> Type "yes" to confirm.
        *   "Now Sell 75 Apple at 224" -> Type "yes" to confirm.
        *   "show me all my orders"
        *   "show me my current net holding"
        *   "compare results of Google and Microsoft