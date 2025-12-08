# Use the official .NET SDK image
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution structure - both Backend and Core projects
COPY Sayanho.Backend/Sayanho.Backend.csproj Sayanho.Backend/
COPY Sayanho.Core/Sayanho.Core.csproj Sayanho.Core/

# Restore dependencies
RUN dotnet restore Sayanho.Backend/Sayanho.Backend.csproj

# Copy the rest of the source code
COPY Sayanho.Backend/ Sayanho.Backend/
COPY Sayanho.Core/ Sayanho.Core/

# Build and publish
WORKDIR /src/Sayanho.Backend
RUN dotnet publish -c Release -o /app/out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

# Expose port (Render will set PORT environment variable)
EXPOSE 10000
ENV ASPNETCORE_URLS=http://+:$PORT

ENTRYPOINT ["dotnet", "Sayanho.Backend.dll"]
