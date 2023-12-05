/* src/App.js */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types'
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { createTodo, updateTodo, deleteTodo } from './graphql/mutations';
import { getTodo } from './graphql/queries';
import { listTodos } from './graphql/queries';
//import { withAuthenticator } from "@aws-amplify/ui-react";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { Button, Heading, Table, TableCell, TableBody, TableHead, TableRow} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import awsExports from './amplifyconfiguration.json';
Amplify.configure(awsExports);

const initialState = { name: '', description: '', place: '' };
const initialSearchState = { search: '' };
const client = generateClient();

const App = (
  //{ signOut, user }
  ) => {
  const [formState, setFormState] = useState(initialState);
  const [editFormState, setEditFormState] = useState(initialState);
  const [searchFormState, setSearchFormState] = useState(initialSearchState);
  const [todos, setTodos] = useState([]);
  const [searchTodo, setSearchTodo] = useState([]);
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const { route } = useAuthenticator(context => [context.route]); 
  const [isEditing, setIsEditing] = useState(false);
  const [editingID] = useState( {editID: ''});

  useEffect(() => {
    fetchTodos();
  }, []);

  function setInput(key, value) {
    setFormState({ ...formState, [key]: value });
  }

  function setEditInput(key, value) {
    setEditFormState({ ...editFormState, [key]: value });
  }

  function setSearchInput(key, value) {
    setSearchFormState({ ...searchFormState, [key]: value });
  }


  async function fetchTodos() {
    try {
      const todoData = await client.graphql({
        query: listTodos,
      });
      const todos = todoData.data.listTodos.items;
      setTodos(todos);
    } catch (err) {
      console.log('error fetching todos');
    }
  }

  async function searchingTodo() {
    try {
      const search = searchFormState.search;
      if (search === '') {
        const searchTodo = initialState;  
        setSearchTodo(searchTodo); 
      } 
      const id = todos.find((todo) => todo.name === search).id
      const searchTodos = await client.graphql({
        query: getTodo,
        variables: {
         id: id
        }
      });
      const searchTodo = searchTodos.data.getTodo;
      setSearchTodo(searchTodo);
      setSearchFormState(initialSearchState);
    } catch (err) {
      console.log('error search todo');
    }
  }

  async function addTodo() {
    try {
      if (!formState.name || !formState.description || !formState.place) return;
      const todo = { ...formState };
      setTodos([...todos, todo]);
      setFormState(initialState);
      await client.graphql({
        query: createTodo,
        variables: {
          input: todo
        }
      });
    } catch (err) {
      console.log('error creating todo:', err);
    }
  }

  async function removeTodo(id) {
    try {
      const item = {
        id:id 
      };
      await client.graphql({
        query: deleteTodo, 
        variables: {
          input: item 
        } 
    });
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (error) {
      console.error('Failed deleting todo:', error);
    }
  }

  async function onItemUpdate(todo) {
    try {
      const item = {
        name: todo.name,
        description: todo.description,
        place: todo.place,
        id: todo.id
      };

      await client.graphql({
        query: updateTodo, 
        variables: {
          input: item
        }
      });
    } catch (error) {
      console.error('Failed updating todo:', error);
    }
  }

  const onEditButtonClick = (id) => {
    if (isEditing) {
      const todo = {
        name: editFormState.name !== '' ? editFormState.name : todos.find((item) => item.id === id).name ,
        description: editFormState.description !== '' ? editFormState.description : todos.find((item) => item.id === id).description ,
        place: editFormState.place !== '' ? editFormState.place : todos.find((item) => item.id === id).place  ,
        id: id
      };
      //todosからidが一致する項目内容を更新
      setTodos(todos.map((item) => (item.id === id ? { ...item, ...todo } : item)));
      setEditFormState(initialState);
      editingID.editID = '';
      onItemUpdate(todo);
    }
    setIsEditing(!isEditing);
    editingID.editID = id;
    setEditFormState(todos.find((item) => item.id === id));
  };

  return (
    <div style={styles.container}>
      { route !== 'authenticated' ? 
        <>
        <Authenticator />
        <input
        onChange={(event) => setSearchInput('search', event.target.value)}
        style={styles.input}
        value={searchFormState.search}
        placeholder="名前で検索する"
        />
        <button style={styles.button} onClick={searchingTodo}>
          名前で検索する
        </button>
        </>
        :
        <>        
        <Heading level={1}>Hello {user.username}</Heading>
        <Button onClick={signOut} style={styles.button}>
          Sign out
        </Button>
        <h2>Amplify Todos</h2>
        <input
          onChange={(event) => setInput('name', event.target.value)}
          style={styles.input}
          value={formState.name}
          placeholder="Name"
        />
        <input
          onChange={(event) => setInput('description', event.target.value)}
          style={styles.input}
          value={formState.description}
          placeholder="Description"
        />
        <input
          onChange={(event) => setInput('place', event.target.value)}
          style={styles.input}
          value={formState.place}
          placeholder="Place"
        />
        <button style={styles.button} onClick={addTodo}>
          Create Todo
        </button>
      </>
      }
        <Table caption="" highlightOnHover={false}>
        <TableHead>
          <TableRow>
            <TableCell as="th">No.</TableCell>
            <TableCell as="th">名前</TableCell>
            <TableCell as="th">内容</TableCell>
            <TableCell as="th">場所</TableCell>
            { route === 'authenticated' ? 
              <>
                <TableCell as="th">更新</TableCell>
                <TableCell as="th">削除</TableCell>
              </>
            :
              ""
            }
          </TableRow>
        </TableHead>
        <TableBody>
        { route === 'authenticated' ?
          <>
          {todos.map((todo, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                {isEditing && todo.id === editingID.editID ? (
                  <input
                    onChange={(event) => setEditInput('name', event.target.value)}
                    style={styles.input}
                    defaultValue={todo.name}
                    placeholder={todo.name}
                  />
                ) : (
                  <>{todo.name}</>
                )}
              </TableCell>
              <TableCell>
                {isEditing && todo.id === editingID.editID ? (
                  <input
                    onChange={(event) => setEditInput('description', event.target.value)}
                    style={styles.input}
                    defaultValue={todo.description}
                    placeholder={todo.description}
                  />
                ) : (
                  <>{todo.description}</>
                )}
              </TableCell>
              <TableCell>
                {isEditing && todo.id === editingID.editID ? (
                  <input
                    onChange={(event) => setEditInput('place', event.target.value)}
                    style={styles.input}
                    defaultValue={todo.place}
                    placeholder={todo.place}
                  />
                ) : (
                  <>{todo.place}</>
                )}
              </TableCell>
              <TableCell>
                  <button style={styles.button} onClick={() => onEditButtonClick(todo.id)}>
                    {isEditing && todo.id === editingID.editID  ? '保存' : '編集'}
                  </button>
                </TableCell>
                <TableCell>
                  <button style={styles.button} onClick={() => removeTodo(todo.id)}>
                  削除
                  </button>
                </TableCell>
            </TableRow>
          ))}
          </>
          : 
          <>
            <TableRow>
            {searchTodo.length !== 0 ?
            <>
              <TableCell>1</TableCell>
              <TableCell>{searchTodo.name}</TableCell>
              <TableCell>{searchTodo.description}</TableCell>
              <TableCell>{searchTodo.place}</TableCell>
            </>
            :
            <>
            </> 
          }
            </TableRow>
          </>
          }
        </TableBody>
      </Table>
  </div>
  );
};

const styles = {
  container: {
    width: 600,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: 20
  },
  todo: { marginBottom: 15 },
  input: {
    border: 'none',
    backgroundColor: '#ddd',
    marginBottom: 10,
    padding: 8,
    fontSize: 18
  },
  todoName: { fontSize: 20, fontWeight: 'bold' },
  todoDescription: { marginBottom: 0 },
  button: {
    backgroundColor: 'black',
    color: 'white',
    outline: 'none',
    fontSize: 18,
    padding: '12px 0px'
  }
};

App.propTypes = {
  signOut: PropTypes.func,
  user: PropTypes.object
}

//export default withAuthenticator(App);
const AppWithAuthentication = () => (
  <Authenticator.Provider>
    <App />
  </Authenticator.Provider>
);

export default AppWithAuthentication;