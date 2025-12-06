from pydantic import BaseModel, Field


class SolveRequest(BaseModel):
    cubeString: str = Field(..., min_length=54, max_length=54, description="54-character Kociemba cube string (U,R,F,D,L,B)")

