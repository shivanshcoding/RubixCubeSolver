from pydantic import BaseModel, Field


class SolveRequest(BaseModel):
    cubeString: str = Field(..., min_length=54, max_length=54, description="54-character Kociemba cube string (U,R,F,D,L,B)")


class ValidateRequest(BaseModel):
    cube_str: str | None = Field(None, description="54-character cube string under key 'cube_str'")
    cubeString: str | None = Field(None, description="Alternative key for cube string, for frontend convenience")
