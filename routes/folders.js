'use strict';

const express = require('express');
const router = express.Router();
const knex = require('../knex'); 




router.get('/', (req, res, next) => {
  knex.select('id', 'name')
    .from('folders')
    .then(results => {
      res.json(results);
    })
    .catch(err => next(err));
});


router.get('/:id', (req, res, next) => {
  const id = req.params.id;
  knex('folders')
    .select()
    .where({ id })
    .then(results => {
      if (results[0]) {
        res.json(results[0]);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

router.put('/:id', (req, res, next) => {
  const id = req.params.id;

  /***** Never trust users - validate input *****/
  const updateObj = {};
  const updateableFields = ['name'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      updateObj[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!updateObj.name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  knex('folders')
    .select()
    .where({id})
    .update(updateObj)
    .returning('*')
    .then(item => {
      if (item) {
        res.json(item[0]);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});


router.post('/', (req, res, next) => {
  const { name } = req.body;

  const newItem = { name };
  /***** Never trust users - validate input *****/
  if (!newItem.name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  knex('folders')
    .insert(newItem)
    .returning(['id', 'name'])
    .then(results => {
      if (results) {
        Object.assign(newItem, results[0]); 
        res.location(`http://${req.headers.host}/folders/${results.id}`).status(201).json(results);
      }
    })
    .catch(err => {
      next(err);
    });
});


router.delete('/:id', (req, res, next) => {
  const id = req.params.id;

  knex('folders')
    .select()
    .where({id})
    .del()
    .then(()=>{  
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
