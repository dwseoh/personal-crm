from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # Add this import
from app.auth import router as auth_router
from app.routes.contacts import router as contacts_router
from app.routes.user import router as user_router
from app.routes.groups import router as groups_router

#app.db
# .database

app = FastAPI()

# CORS for your frontend (uncomment this)
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers - remove the prefix since it's already defined in auth.py
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(groups_router)
app.include_router(contacts_router)


@app.get("/")
def root():
    return {"message": "Personal CRM Backend is running 🚀"}


'''
# Include your routes
app.include_router(contacts.router, prefix="/contacts", dependencies=[Depends(verify_token)])
#make it user information based 
'''
'''
#python3 -m venv venv
run this --> source venv/bin/activate   # Mac/Linux
run this --> pip freeze > requirements.txt

uvicorn app.main:app --reload

source /Users/jamieseoh/Documents/Projects/personal-crm/backend/venv/bin/activate


'''

