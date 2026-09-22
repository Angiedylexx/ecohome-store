const ProductModel = require('../models/product.model');

const ProductController = {
  async getAllProducts(req, res) {
    try {
      const products = await ProductModel.getAll();
      res.json(products);
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({ error: 'Error al obtener los productos' });
    }
  },

  async createProduct(req, res) {
    try {
      const { name, price } = req.body;
      const newProduct = await ProductModel.create({ name, price });
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({ error: 'Error al crear el producto' });
    }
  },

  async getProductById(req, res) {
    try {
      const product = await ProductModel.getById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(product);
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({ error: 'Error al obtener el producto' });
    }
  },

  async updateProduct(req, res) {
    try {
      const { name, price } = req.body;
      const updated = await ProductModel.update(req.params.id, { name, price });
      if (!updated) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(updated);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({ error: 'Error al actualizar el producto' });
    }
  },

  async deleteProduct(req, res) {
    try {
      const deleted = await ProductModel.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json({ message: 'Producto eliminado', product: deleted });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  },
};

module.exports = ProductController;
