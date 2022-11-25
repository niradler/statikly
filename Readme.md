# statikly

```js
npm i -g statikly
```

defaults:

- template engine ejs
- views folder = views
- api folder = api
- public folder = public

_All routes is file base:_

views/notes/index.ejs => /notes
views/note/[id].ejs => /note/:id

api/notes/index.js => api/notes
api/note/[id].js => api/note/:id

# Getting Started

Write your first view, create views/index.js and run statikly

```ejs
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>statikly</title>
    <meta name="description" content="" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <h1><%= "query" %></h1>
    <h3><%= JSON.stringify(query,null,2); %></h3>
    <h1><%= "params" %></h1>
    <h3><%= JSON.stringify(params,null,2); %></h3>
    <h1><%= "data" %></h1>
    <h3><%= JSON.stringify(data,null,2); %></h3>
    <h1><%= "env" %></h1>
    <h3><%= JSON.stringify(env,null,2); %></h3>
  </body>
```
