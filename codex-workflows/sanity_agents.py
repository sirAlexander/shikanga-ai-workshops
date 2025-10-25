try:
    from agents import Agent, Runner
    print("Agents SDK import OK")
except Exception as e:
    print("Agents SDK import failed:", e)