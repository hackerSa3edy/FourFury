# Start with an official Python runtime as a parent image
FROM python:3.12-slim

# Set environmental variables
ENV PYTHONUNBUFFERED=true

# Set the working directory in the container
WORKDIR /app

# Update
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev gcc && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the rest of the project files into the container
COPY . /app

# Install poetry and project dependencies
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-root --without dev

# Expose the port number that the application will listen on
EXPOSE 8000

# Start the server with uvicorn
CMD ["poetry", "run", "uvicorn", "src.fourfury.run:app", "--host", "0.0.0.0", "--port", "8000"]
