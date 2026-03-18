from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.routes.contacts import router as contacts_router
from app.routes.user import router as user_router
from app.routes.groups import router as groups_router
from app.routes.dashboard import router as dashboard_router
from app.routes.interactions import router as interactions_router
from app.routes.analytics import router as analytics_router

app = FastAPI(title="Personal CRM API", version="1.0.0")

# CORS configuration
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(groups_router)
app.include_router(contacts_router)
app.include_router(dashboard_router)
app.include_router(interactions_router)
app.include_router(analytics_router)


@app.get("/")
def root():
    return {"message": "Personal CRM Backend is running 🚀"}

