# CheckBranches
This is a small utility script that checks for the existence of Git branches in a remote repository.

The script parses a CSV file that contains a list of repositories and branches, requests a list of branches from the Git origin and modifies the CSV so that only existing branches will remain.

## 1. Set up the environment
- Create the CSV file and make sure it has the following format:
    ```csv
    repository,branch,responsible_person
    project-alpha,A-4269,Tom
    project-beta,B-024,John
    ```
    > Tip: Copy the `branchlist.csv.example` file and change the data lines (leave the header).

- Create an `.env` file that contains the paths and necessary credentials. Add the path to you CSV file. 
    > Tip: Copy the `.env.example` file to see all the required environment variables. 

## 2. Build the Docker image
Use the following command:
```
docker build -t checkbranches .
```

## 3. Run the Docker container
Use the following command:
```
docker container run --rm -v $(pwd)/:/checkbranches checkbranches
```
> Note: On Windows you need to use `${pwd}` (i.e. curly braces) for the "current directory" macro. 